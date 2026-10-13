from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.limits import STATUS_UNDO_WINDOW
from app.core.logging import get_logger
from app.domain.commands import LeadChanges, LeadFilters, NewLead
from app.domain.cursor import Keyset, decode_cursor
from app.domain.enums import ActivityKind, FollowUpState, LeadStatus
from app.domain.errors import DuplicatePhoneError, LeadNotFoundError, NoPendingFollowUpError
from app.domain.follow_up_policy import today_window
from app.domain.text import blank_to_none, normalize_phone
from app.models import Activity, Lead
from app.repositories.activity_repository import ActivityRepository
from app.repositories.lead_repository import LeadRepository, LeadRow
from app.services.views import (
    FollowUpsView,
    LeadStatsView,
    LeadView,
    PageView,
    lead_row_view,
    page_of,
)

PHONE_UNIQUE_INDEX = "uq_leads_phone_normalized"

logger = get_logger("app.leads")


def _row_keyset(row: LeadRow) -> Keyset:
    return Keyset(at=row.lead.last_activity_at, id=row.lead.id)


class LeadService:
    def __init__(self, session: AsyncSession, clock: Clock) -> None:
        self._session = session
        self._clock = clock
        self._leads = LeadRepository(session)
        self._activities = ActivityRepository(session)

    async def list_leads(
        self, filters: LeadFilters, cursor: str | None, limit: int, zone: ZoneInfo
    ) -> PageView[LeadView]:
        after = decode_cursor(cursor) if cursor else None
        now = self._clock.now()
        async with self._session.begin():
            rows = await self._leads.list_page(self._clean(filters), after, limit + 1)
        return page_of(rows, limit, _row_keyset, lambda row: lead_row_view(row, now, zone))

    async def follow_ups(self, filters: LeadFilters, zone: ZoneInfo) -> FollowUpsView:
        now = self._clock.now()
        due_before = today_window(now, zone).end
        async with self._session.begin():
            rows = await self._leads.list_due_before(self._clean(filters), due_before)
        views = [lead_row_view(row, now, zone) for row in rows]
        return FollowUpsView(
            overdue=[view for view in views if view.follow_up_state is FollowUpState.OVERDUE],
            today=[view for view in views if view.follow_up_state is FollowUpState.TODAY],
        )

    async def stats(self, search: str | None, zone: ZoneInfo) -> LeadStatsView:
        now = self._clock.now()
        async with self._session.begin():
            counts = await self._leads.count(blank_to_none(search), today_window(now, zone))
        return LeadStatsView(
            total=sum(counts.by_status.values()),
            by_status=counts.by_status,
            overdue=counts.overdue,
            due_today=counts.due_today,
        )

    async def get_lead(self, lead_id: UUID, zone: ZoneInfo) -> LeadView:
        now = self._clock.now()
        async with self._session.begin():
            row = await self._require_row(lead_id)
        return lead_row_view(row, now, zone)

    async def create_lead(self, new_lead: NewLead, zone: ZoneInfo) -> LeadView:
        now = self._clock.now()
        phone_normalized = normalize_phone(new_lead.phone) if new_lead.phone else None
        async with self._session.begin():
            if phone_normalized:
                await self._ensure_phone_available(phone_normalized, exclude_id=None)
            lead = Lead(
                name=new_lead.name,
                company=new_lead.company,
                phone=new_lead.phone,
                phone_normalized=phone_normalized,
                status=LeadStatus.NEW,
                last_activity_at=now,
                created_at=now,
                updated_at=now,
            )
            await self._save_lead(lead, phone_normalized)
            await self._activities.add(
                Activity(lead_id=lead.id, kind=ActivityKind.LEAD_CREATED, occurred_at=now)
            )
            row = await self._require_row(lead.id)
        logger.info("lead.created", lead_id=str(lead.id))
        return lead_row_view(row, now, zone)

    async def update_lead(self, lead_id: UUID, changes: LeadChanges, zone: ZoneInfo) -> LeadView:
        now = self._clock.now()
        async with self._session.begin():
            lead = await self._require_for_update(lead_id)
            changed_fields = await self._apply_details(lead, changes)
            if "status" in changes and changes["status"] != lead.status:
                await self._change_status(lead, changes["status"], now)
                changed_fields.append("status")
            if changed_fields:
                lead.updated_at = now
                await self._save_lead(lead, lead.phone_normalized)
            row = await self._require_row(lead.id)
        detail_fields = [field for field in changed_fields if field != "status"]
        if detail_fields:
            logger.info("lead.updated", lead_id=str(lead.id), fields=detail_fields)
        return lead_row_view(row, now, zone)

    async def complete_follow_up(self, lead_id: UUID, zone: ZoneInfo) -> LeadView:
        now = self._clock.now()
        async with self._session.begin():
            lead = await self._require_for_update(lead_id)
            due_at = lead.next_follow_up_at
            if due_at is None:
                raise NoPendingFollowUpError()
            await self._activities.add(
                Activity(
                    lead_id=lead.id,
                    kind=ActivityKind.FOLLOW_UP_COMPLETED,
                    meta={"due_at": due_at.isoformat()},
                    occurred_at=now,
                )
            )
            lead.next_follow_up_at = None
            lead.last_activity_at = now
            lead.updated_at = now
            row = await self._require_row(lead.id)
        logger.info("follow_up.completed", lead_id=str(lead.id))
        return lead_row_view(row, now, zone)

    @staticmethod
    def _clean(filters: LeadFilters) -> LeadFilters:
        return LeadFilters(status=filters.status, search=blank_to_none(filters.search))

    async def _apply_details(self, lead: Lead, changes: LeadChanges) -> list[str]:
        changed: list[str] = []
        if "name" in changes and changes["name"] != lead.name:
            lead.name = changes["name"]
            changed.append("name")
        if "company" in changes and changes["company"] != lead.company:
            lead.company = changes["company"]
            changed.append("company")
        if "phone" in changes and changes["phone"] != lead.phone:
            phone = changes["phone"]
            phone_normalized = normalize_phone(phone) if phone else None
            if phone_normalized and phone_normalized != lead.phone_normalized:
                await self._ensure_phone_available(phone_normalized, exclude_id=lead.id)
            lead.phone = phone
            lead.phone_normalized = phone_normalized
            changed.append("phone")
        return changed

    async def _change_status(self, lead: Lead, target: LeadStatus, now: datetime) -> None:
        previous = LeadStatus(lead.status)
        latest = await self._activities.latest(lead.id)
        if latest is not None and self._reverts(latest, previous, target, now):
            await self._undo_status_change(lead, latest, target)
            logger.info(
                "lead.status_changed",
                lead_id=str(lead.id),
                from_status=previous.value,
                to_status=target.value,
                coalesced=True,
            )
            return

        cleared_follow_up = lead.next_follow_up_at if target.is_closed else None
        if cleared_follow_up is not None:
            lead.next_follow_up_at = None
        await self._activities.add(
            Activity(
                lead_id=lead.id,
                kind=ActivityKind.STATUS_CHANGED,
                meta={
                    "from": previous.value,
                    "to": target.value,
                    "cleared_follow_up_at": (
                        cleared_follow_up.isoformat() if cleared_follow_up else None
                    ),
                },
                occurred_at=now,
            )
        )
        lead.status = target
        lead.last_activity_at = now
        logger.info(
            "lead.status_changed",
            lead_id=str(lead.id),
            from_status=previous.value,
            to_status=target.value,
            coalesced=False,
        )

    @staticmethod
    def _reverts(latest: Activity, current: LeadStatus, target: LeadStatus, now: datetime) -> bool:
        meta = latest.meta or {}
        return (
            latest.kind == ActivityKind.STATUS_CHANGED
            and meta.get("from") == target.value
            and meta.get("to") == current.value
            and timedelta(0) <= now - latest.occurred_at < STATUS_UNDO_WINDOW
        )

    async def _undo_status_change(self, lead: Lead, latest: Activity, target: LeadStatus) -> None:
        restored = (latest.meta or {}).get("cleared_follow_up_at")
        await self._activities.delete(latest)
        lead.status = target
        if restored:
            lead.next_follow_up_at = datetime.fromisoformat(restored)
        lead.last_activity_at = (
            await self._activities.latest_occurred_at(lead.id) or lead.created_at
        )

    async def _ensure_phone_available(self, phone_normalized: str, exclude_id: UUID | None) -> None:
        existing = await self._leads.find_by_phone(phone_normalized, exclude_id)
        if existing is not None:
            raise DuplicatePhoneError(existing.id, existing.name)

    async def _save_lead(self, lead: Lead, phone_normalized: str | None) -> None:
        try:
            async with self._session.begin_nested():
                self._session.add(lead)
                await self._session.flush()
        except IntegrityError as error:
            if phone_normalized and PHONE_UNIQUE_INDEX in str(error.orig):
                existing = await self._leads.find_by_phone(phone_normalized, exclude_id=lead.id)
                if existing is not None:
                    raise DuplicatePhoneError(existing.id, existing.name) from error
            raise

    async def _require_for_update(self, lead_id: UUID) -> Lead:
        lead = await self._leads.get_for_update(lead_id)
        if lead is None:
            raise LeadNotFoundError(lead_id)
        return lead

    async def _require_row(self, lead_id: UUID) -> LeadRow:
        row = await self._leads.get_row(lead_id)
        if row is None:
            raise LeadNotFoundError(lead_id)
        return row
