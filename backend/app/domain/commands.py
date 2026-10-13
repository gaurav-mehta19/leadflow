from dataclasses import dataclass
from datetime import datetime
from typing import TypedDict

from app.domain.enums import LeadStatus


@dataclass(frozen=True, slots=True)
class NewLead:
    name: str
    company: str | None = None
    phone: str | None = None


class LeadChanges(TypedDict, total=False):
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus


@dataclass(frozen=True, slots=True)
class NewNote:
    body: str
    follow_up_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class LeadFilters:
    status: LeadStatus | None = None
    search: str | None = None
