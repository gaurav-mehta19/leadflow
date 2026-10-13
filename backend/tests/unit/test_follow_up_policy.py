from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.domain.enums import FollowUpState
from app.domain.follow_up_policy import follow_up_state, follow_up_window_problem, today_window

KOLKATA = ZoneInfo("Asia/Kolkata")
NEW_YORK = ZoneInfo("America/New_York")
UTC_JUST_AFTER_MIDNIGHT = datetime(2026, 5, 4, 0, 30, tzinfo=UTC)


def test_no_due_date_is_none() -> None:
    assert follow_up_state(None, UTC_JUST_AFTER_MIDNIGHT, KOLKATA) is FollowUpState.NONE


@pytest.mark.parametrize(
    ("due_at", "kolkata_state", "new_york_state"),
    [
        (datetime(2026, 5, 3, 18, 0, tzinfo=UTC), FollowUpState.OVERDUE, FollowUpState.TODAY),
        (datetime(2026, 5, 3, 20, 0, tzinfo=UTC), FollowUpState.TODAY, FollowUpState.TODAY),
        (datetime(2026, 5, 4, 5, 0, tzinfo=UTC), FollowUpState.TODAY, FollowUpState.UPCOMING),
        (datetime(2026, 5, 4, 18, 30, tzinfo=UTC), FollowUpState.UPCOMING, FollowUpState.UPCOMING),
        (datetime(2026, 5, 3, 3, 0, tzinfo=UTC), FollowUpState.OVERDUE, FollowUpState.OVERDUE),
    ],
)
def test_buckets_depend_on_the_viewers_time_zone(
    due_at: datetime, kolkata_state: FollowUpState, new_york_state: FollowUpState
) -> None:
    assert follow_up_state(due_at, UTC_JUST_AFTER_MIDNIGHT, KOLKATA) is kolkata_state
    assert follow_up_state(due_at, UTC_JUST_AFTER_MIDNIGHT, NEW_YORK) is new_york_state


def test_time_already_passed_today_is_still_today() -> None:
    now = datetime(2026, 5, 4, 10, 0, tzinfo=UTC)
    earlier_today = now - timedelta(hours=3)

    assert follow_up_state(earlier_today, now, KOLKATA) is FollowUpState.TODAY


def test_last_microsecond_of_the_day_is_today_and_midnight_is_upcoming() -> None:
    now = datetime(2026, 5, 4, 6, 30, tzinfo=UTC)
    window = today_window(now, KOLKATA)

    assert follow_up_state(window.end - timedelta(microseconds=1), now, KOLKATA) is (
        FollowUpState.TODAY
    )
    assert follow_up_state(window.end, now, KOLKATA) is FollowUpState.UPCOMING
    assert follow_up_state(window.start - timedelta(microseconds=1), now, KOLKATA) is (
        FollowUpState.OVERDUE
    )


def test_today_window_is_expressed_in_utc() -> None:
    window = today_window(datetime(2026, 5, 4, 6, 30, tzinfo=UTC), KOLKATA)

    assert window.start == datetime(2026, 5, 3, 18, 30, tzinfo=UTC)
    assert window.end == datetime(2026, 5, 4, 18, 30, tzinfo=UTC)


def test_today_window_handles_daylight_saving_transitions() -> None:
    window = today_window(datetime(2026, 3, 8, 15, 0, tzinfo=UTC), NEW_YORK)

    assert window.end - window.start == timedelta(hours=23)


@pytest.mark.parametrize(
    ("offset", "expected"),
    [
        (timedelta(seconds=-61), "Pick a time in the future."),
        (timedelta(seconds=-60), None),
        (timedelta(hours=2), None),
        (timedelta(days=365), None),
        (timedelta(days=365, seconds=1), "Pick a time within the next 365 days."),
    ],
)
def test_follow_up_window_rules(offset: timedelta, expected: str | None) -> None:
    now = datetime(2026, 5, 4, 6, 30, tzinfo=UTC)

    assert follow_up_window_problem(now + offset, now) == expected
