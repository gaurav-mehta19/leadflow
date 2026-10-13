from datetime import UTC, datetime, timedelta

import pytest

from app.domain.enums import LeadStatus
from app.domain.stale_policy import STALE_AFTER, idle_days, is_stale

NOW = datetime(2026, 5, 4, 6, 30, tzinfo=UTC)


@pytest.mark.parametrize(
    ("status", "threshold_days"),
    [
        (LeadStatus.NEW, 2),
        (LeadStatus.CONTACTED, 4),
        (LeadStatus.QUALIFIED, 7),
        (LeadStatus.PROPOSAL_SENT, 5),
    ],
)
def test_open_statuses_go_stale_after_their_threshold(
    status: LeadStatus, threshold_days: int
) -> None:
    assert STALE_AFTER[status] == timedelta(days=threshold_days)
    at_threshold = NOW - timedelta(days=threshold_days)

    assert not is_stale(status, at_threshold, NOW)
    assert is_stale(status, at_threshold - timedelta(minutes=1), NOW)


@pytest.mark.parametrize("status", [LeadStatus.WON, LeadStatus.LOST])
def test_closed_leads_are_never_stale(status: LeadStatus) -> None:
    assert not is_stale(status, NOW - timedelta(days=400), NOW)


@pytest.mark.parametrize(
    ("elapsed", "expected"),
    [
        (timedelta(0), 0),
        (timedelta(hours=23, minutes=59), 0),
        (timedelta(days=1), 1),
        (timedelta(days=6, hours=20), 6),
        (timedelta(hours=-3), 0),
    ],
)
def test_idle_days_counts_whole_days(elapsed: timedelta, expected: int) -> None:
    assert idle_days(NOW - elapsed, NOW) == expected
