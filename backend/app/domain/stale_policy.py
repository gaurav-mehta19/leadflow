from datetime import datetime, timedelta

from app.domain.enums import LeadStatus

STALE_AFTER: dict[LeadStatus, timedelta] = {
    LeadStatus.NEW: timedelta(days=2),
    LeadStatus.CONTACTED: timedelta(days=4),
    LeadStatus.QUALIFIED: timedelta(days=7),
    LeadStatus.PROPOSAL_SENT: timedelta(days=5),
}


def idle_days(last_activity_at: datetime, now: datetime) -> int:
    return max((now - last_activity_at).days, 0)


def is_stale(status: LeadStatus, last_activity_at: datetime, now: datetime) -> bool:
    threshold = STALE_AFTER.get(status)
    return threshold is not None and now - last_activity_at > threshold
