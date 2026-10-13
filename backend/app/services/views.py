from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from app.domain.cursor import Keyset, encode_cursor
from app.domain.enums import FollowUpState, LeadStatus
from app.domain.follow_up_policy import follow_up_state
from app.domain.stale_policy import idle_days, is_stale
from app.domain.text import note_preview
from app.models import Activity, Lead
from app.repositories.lead_repository import LeadRow


@dataclass(frozen=True, slots=True)
class LastNoteView:
    preview: str
    occurred_at: datetime


@dataclass(frozen=True, slots=True)
class LeadView:
    id: UUID
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    next_follow_up_at: datetime | None
    follow_up_state: FollowUpState
    is_stale: bool
    idle_days: int
    last_note: LastNoteView | None
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class PageView[ItemT]:
    items: list[ItemT]
    next_cursor: str | None


@dataclass(frozen=True, slots=True)
class FollowUpsView:
    overdue: list[LeadView]
    today: list[LeadView]


@dataclass(frozen=True, slots=True)
class LeadStatsView:
    total: int
    by_status: dict[LeadStatus, int]
    overdue: int
    due_today: int


@dataclass(frozen=True, slots=True)
class NoteLoggedView:
    activity: Activity
    lead: LeadView


def last_note_view(body: str | None, occurred_at: datetime | None) -> LastNoteView | None:
    if body is None or occurred_at is None:
        return None
    return LastNoteView(preview=note_preview(body), occurred_at=occurred_at)


def lead_view(
    lead: Lead, last_note: LastNoteView | None, now: datetime, zone: ZoneInfo
) -> LeadView:
    status = LeadStatus(lead.status)
    return LeadView(
        id=lead.id,
        name=lead.name,
        company=lead.company,
        phone=lead.phone,
        status=status,
        next_follow_up_at=lead.next_follow_up_at,
        follow_up_state=follow_up_state(lead.next_follow_up_at, now, zone),
        is_stale=is_stale(status, lead.last_activity_at, now),
        idle_days=idle_days(lead.last_activity_at, now),
        last_note=last_note,
        last_activity_at=lead.last_activity_at,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


def lead_row_view(row: LeadRow, now: datetime, zone: ZoneInfo) -> LeadView:
    return lead_view(row.lead, last_note_view(row.last_note_body, row.last_note_at), now, zone)


def page_of[ItemT, ViewT](
    items: list[ItemT],
    limit: int,
    keyset_of: Callable[[ItemT], Keyset],
    to_view: Callable[[ItemT], ViewT],
) -> PageView[ViewT]:
    visible = items[:limit]
    next_cursor = encode_cursor(keyset_of(visible[-1])) if len(items) > limit else None
    return PageView(items=[to_view(item) for item in visible], next_cursor=next_cursor)
