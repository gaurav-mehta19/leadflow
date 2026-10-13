from datetime import datetime
from typing import Annotated, Self
from uuid import UUID

from pydantic import (
    AfterValidator,
    BeforeValidator,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.core.limits import COMPANY_MAX_LENGTH, NAME_MAX_LENGTH, PHONE_MAX_LENGTH
from app.domain.commands import LeadChanges, NewLead
from app.domain.enums import FollowUpState, LeadStatus
from app.domain.text import collapse_whitespace, normalize_phone
from app.schemas.common import Page, RequestModel, ResponseModel


def _collapse(value: object) -> object:
    return collapse_whitespace(value) if isinstance(value, str) else value


def _blank_to_none(value: object) -> object:
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _valid_phone(value: str) -> str:
    normalize_phone(value)
    return value


LeadName = Annotated[
    str,
    BeforeValidator(_collapse),
    StringConstraints(min_length=1, max_length=NAME_MAX_LENGTH),
    Field(examples=["Ananya Iyer"]),
]
Company = Annotated[
    Annotated[str, StringConstraints(max_length=COMPANY_MAX_LENGTH)] | None,
    BeforeValidator(_blank_to_none),
    Field(examples=["Meridian Wealth Partners"]),
]
Phone = Annotated[
    Annotated[str, StringConstraints(max_length=PHONE_MAX_LENGTH), AfterValidator(_valid_phone)]
    | None,
    BeforeValidator(_blank_to_none),
    Field(examples=["+91 98765 43210"]),
]


class LeadCreate(RequestModel):
    name: LeadName
    company: Company = None
    phone: Phone = None

    def to_command(self) -> NewLead:
        return NewLead(name=self.name, company=self.company, phone=self.phone)


class LeadUpdate(RequestModel):
    name: LeadName | None = None
    company: Company = None
    phone: Phone = None
    status: LeadStatus | None = None

    @field_validator("name", "status")
    @classmethod
    def reject_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("This field can't be null.")
        return value

    @model_validator(mode="after")
    def require_a_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Provide at least one field")
        return self

    def to_changes(self) -> LeadChanges:
        changes: LeadChanges = {}
        provided = self.model_fields_set
        if "name" in provided and self.name is not None:
            changes["name"] = self.name
        if "company" in provided:
            changes["company"] = self.company
        if "phone" in provided:
            changes["phone"] = self.phone
        if "status" in provided and self.status is not None:
            changes["status"] = self.status
        return changes


class LastNoteRead(ResponseModel):
    preview: str
    occurred_at: datetime


class LeadRead(ResponseModel):
    id: UUID
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    next_follow_up_at: datetime | None
    follow_up_state: FollowUpState
    is_stale: bool
    idle_days: int
    last_note: LastNoteRead | None
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime


class LeadPage(Page[LeadRead]):
    pass


class FollowUpsRead(ResponseModel):
    overdue: list[LeadRead]
    today: list[LeadRead]


class StatusCounts(ResponseModel):
    new: int
    contacted: int
    qualified: int
    proposal_sent: int
    won: int
    lost: int


class LeadStatsRead(ResponseModel):
    total: int
    by_status: StatusCounts
    overdue: int
    due_today: int
