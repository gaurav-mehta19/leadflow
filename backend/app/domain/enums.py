from enum import StrEnum


class LeadStatus(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    WON = "won"
    LOST = "lost"

    @property
    def is_open(self) -> bool:
        return self in OPEN_STATUSES

    @property
    def is_closed(self) -> bool:
        return self in CLOSED_STATUSES


OPEN_STATUSES: frozenset[LeadStatus] = frozenset(
    {LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL_SENT}
)
CLOSED_STATUSES: frozenset[LeadStatus] = frozenset({LeadStatus.WON, LeadStatus.LOST})


class ActivityKind(StrEnum):
    NOTE = "note"
    LEAD_CREATED = "lead_created"
    STATUS_CHANGED = "status_changed"
    FOLLOW_UP_COMPLETED = "follow_up_completed"


class FollowUpState(StrEnum):
    NONE = "none"
    OVERDUE = "overdue"
    TODAY = "today"
    UPCOMING = "upcoming"
