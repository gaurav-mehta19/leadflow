from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.core.limits import FOLLOW_UP_MAX_AHEAD, FOLLOW_UP_PAST_TOLERANCE
from app.domain.enums import FollowUpState


@dataclass(frozen=True, slots=True)
class DayWindow:
    start: datetime
    end: datetime


def today_window(now: datetime, zone: ZoneInfo) -> DayWindow:
    local_today = now.astimezone(zone).date()
    start = datetime.combine(local_today, time.min, tzinfo=zone)
    end = datetime.combine(local_today + timedelta(days=1), time.min, tzinfo=zone)
    return DayWindow(start=start.astimezone(UTC), end=end.astimezone(UTC))


def follow_up_state(due_at: datetime | None, now: datetime, zone: ZoneInfo) -> FollowUpState:
    if due_at is None:
        return FollowUpState.NONE
    window = today_window(now, zone)
    if due_at < window.start:
        return FollowUpState.OVERDUE
    if due_at < window.end:
        return FollowUpState.TODAY
    return FollowUpState.UPCOMING


def follow_up_window_problem(due_at: datetime, now: datetime) -> str | None:
    if due_at < now - FOLLOW_UP_PAST_TOLERANCE:
        return "Pick a time in the future."
    if due_at > now + FOLLOW_UP_MAX_AHEAD:
        return f"Pick a time within the next {FOLLOW_UP_MAX_AHEAD.days} days."
    return None
