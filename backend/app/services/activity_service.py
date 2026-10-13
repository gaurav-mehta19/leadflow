from datetime import UTC, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.logging import get_logger
from app.domain.commands import NewNote
from app.domain.cursor import Keyset, decode_cursor
from app.domain.enums import ActivityKind, LeadStatus
from app.domain.errors import ActivityNotFoundError, FollowUpNotAllowedError, LeadNotFoundError
from app.domain.follow_up_policy import follow_up_window_problem
from app.models import Activity, Lead
from app.repositories.activity_repository import ActivityRepository
from app.repositories.lead_repository import LeadRepository
from app.services.views import NoteLoggedView, PageView, last_note_view, lead_view, page_of

CLOSED_LEAD_FOLLOW_UP_MESSAGE = "Move this lead back to an open stage to schedule a follow-up."

logger = get_logger("app.activities")


def _activity_keyset(activity: Activity) -> Keyset:
    return Keyset(at=activity.occurred_at, id=activity.id)


def _identity(activity: Activity) -> Activity:
    return activity


class ActivityService:
    def __init__(self, session: AsyncSession, clock: Clock) -> None:
        self._session = session
        self._clock = clock
        self._leads = LeadRepository(session)
        self._activities = ActivityRepository(session)

    async def list_activities(
        self, lead_id: UUID, cursor: str | None, limit: int
    ) -> PageView[Activity]:
        after = decode_cursor(cursor) if cursor else None
        async with self._session.begin():
            await self._require_lead(lead_id)
            activities = await self._activities.list_page(lead_id, after, limit + 1)
        return page_of(activities, limit, _activity_keyset, _identity)

    async def get_activity(self, lead_id: UUID, activity_id: UUID) -> Activity:
        async with self._session.begin():
            await self._require_lead(lead_id)
            activity = await self._activities.get(lead_id, activity_id)
        if activity is None:
            raise ActivityNotFoundError(activity_id)
        return activity

    async def log_note(self, lead_id: UUID, note: NewNote, zone: ZoneInfo) -> NoteLoggedView:
        now = self._clock.now()
        follow_up_at = note.follow_up_at.astimezone(UTC) if note.follow_up_at else None
        async with self._session.begin():
            lead = await self._leads.get_for_update(lead_id)
            if lead is None:
                raise LeadNotFoundError(lead_id)
            if follow_up_at is not None:
                self._validate_follow_up(lead, follow_up_at, now)
            activity = await self._activities.add(
                Activity(
                    lead_id=lead.id,
                    kind=ActivityKind.NOTE,
                    body=note.body,
                    follow_up_at=follow_up_at,
                    occurred_at=now,
                )
            )
            lead.last_activity_at = now
            lead.updated_at = now
            if follow_up_at is not None:
                lead.next_follow_up_at = follow_up_at
        logger.info(
            "note.logged",
            lead_id=str(lead.id),
            activity_id=str(activity.id),
            follow_up_set=follow_up_at is not None,
        )
        return NoteLoggedView(
            activity=activity,
            lead=lead_view(lead, last_note_view(note.body, now), now, zone),
        )

    @staticmethod
    def _validate_follow_up(lead: Lead, follow_up_at: datetime, now: datetime) -> None:
        if LeadStatus(lead.status).is_closed:
            raise FollowUpNotAllowedError(CLOSED_LEAD_FOLLOW_UP_MESSAGE)
        problem = follow_up_window_problem(follow_up_at, now)
        if problem is not None:
            raise FollowUpNotAllowedError(problem)

    async def _require_lead(self, lead_id: UUID) -> Lead:
        lead = await self._leads.get(lead_id)
        if lead is None:
            raise LeadNotFoundError(lead_id)
        return lead
