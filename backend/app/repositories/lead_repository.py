from dataclasses import dataclass
from datetime import datetime
from typing import NamedTuple
from uuid import UUID

from sqlalchemy import (
    ColumnClause,
    ColumnElement,
    Select,
    and_,
    func,
    literal_column,
    or_,
    select,
    true,
    tuple_,
)

from app.core.limits import NOTE_PREVIEW_SOURCE_LENGTH
from app.domain.commands import LeadFilters
from app.domain.cursor import Keyset
from app.domain.enums import OPEN_STATUSES, ActivityKind, LeadStatus
from app.domain.follow_up_policy import DayWindow
from app.models import Activity, Lead
from app.repositories.base import Repository, escape_like

NOTE_KIND: ColumnClause[str] = literal_column(f"'{ActivityKind.NOTE.value}'")


class LeadRow(NamedTuple):
    lead: Lead
    last_note_body: str | None
    last_note_at: datetime | None


@dataclass(frozen=True, slots=True)
class LeadCounts:
    by_status: dict[LeadStatus, int]
    overdue: int
    due_today: int


def _search_condition(search: str) -> ColumnElement[bool]:
    pattern = escape_like(search.lower())
    return or_(
        func.lower(Lead.name).like(pattern, escape="\\"),
        func.lower(Lead.company).like(pattern, escape="\\"),
    )


def _is_open() -> ColumnElement[bool]:
    return Lead.status.in_(sorted(OPEN_STATUSES))


def _apply_filters[*RowT](statement: Select[*RowT], filters: LeadFilters) -> Select[*RowT]:
    if filters.status is not None:
        statement = statement.where(Lead.status == filters.status)
    if filters.search:
        statement = statement.where(_search_condition(filters.search))
    return statement


def _with_last_note() -> Select[Lead, str | None, datetime | None]:
    last_note = (
        select(
            func.left(Activity.body, NOTE_PREVIEW_SOURCE_LENGTH).label("body"),
            Activity.occurred_at.label("occurred_at"),
        )
        .where(Activity.lead_id == Lead.id, Activity.kind == NOTE_KIND)
        .order_by(Activity.occurred_at.desc())
        .limit(1)
        .lateral("last_note")
    )
    return select(Lead, last_note.c.body, last_note.c.occurred_at).outerjoin(last_note, true())


class LeadRepository(Repository[Lead]):
    async def get(self, lead_id: UUID) -> Lead | None:
        return await self._session.get(Lead, lead_id)

    async def get_for_update(self, lead_id: UUID) -> Lead | None:
        statement = (
            select(Lead)
            .where(Lead.id == lead_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return (await self._session.execute(statement)).scalar_one_or_none()

    async def get_row(self, lead_id: UUID) -> LeadRow | None:
        statement = _with_last_note().where(Lead.id == lead_id)
        row = (await self._session.execute(statement)).one_or_none()
        return None if row is None else LeadRow(*row)

    async def find_by_phone(self, phone_normalized: str, exclude_id: UUID | None) -> Lead | None:
        statement = select(Lead).where(Lead.phone_normalized == phone_normalized)
        if exclude_id is not None:
            statement = statement.where(Lead.id != exclude_id)
        return (await self._session.execute(statement.limit(1))).scalar_one_or_none()

    async def list_page(
        self, filters: LeadFilters, after: Keyset | None, limit: int
    ) -> list[LeadRow]:
        statement = _apply_filters(_with_last_note(), filters)
        if after is not None:
            statement = statement.where(
                tuple_(Lead.last_activity_at, Lead.id) < tuple_(after.at, after.id)
            )
        statement = statement.order_by(Lead.last_activity_at.desc(), Lead.id.desc()).limit(limit)
        return [LeadRow(*row) for row in (await self._session.execute(statement)).all()]

    async def list_due_before(self, filters: LeadFilters, before: datetime) -> list[LeadRow]:
        statement = (
            _apply_filters(_with_last_note(), filters)
            .where(Lead.next_follow_up_at < before, _is_open())
            .order_by(Lead.next_follow_up_at.asc(), Lead.id.asc())
        )
        return [LeadRow(*row) for row in (await self._session.execute(statement)).all()]

    async def count(self, search: str | None, today: DayWindow) -> LeadCounts:
        overdue = and_(_is_open(), Lead.next_follow_up_at < today.start)
        due_today = and_(
            _is_open(),
            Lead.next_follow_up_at >= today.start,
            Lead.next_follow_up_at < today.end,
        )
        statement = _apply_filters(
            select(
                Lead.status,
                func.count(),
                func.count().filter(overdue),
                func.count().filter(due_today),
            ),
            LeadFilters(search=search),
        ).group_by(Lead.status)
        rows = (await self._session.execute(statement)).all()
        by_status = dict.fromkeys(LeadStatus, 0)
        for status, total, _, _ in rows:
            by_status[LeadStatus(status)] = total
        return LeadCounts(
            by_status=by_status,
            overdue=sum(row[2] for row in rows),
            due_today=sum(row[3] for row in rows),
        )
