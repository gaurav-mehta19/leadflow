from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import Field, StringConstraints, field_validator

from app.core.limits import NOTE_MAX_LENGTH
from app.domain.commands import NewNote
from app.domain.enums import ActivityKind
from app.schemas.common import Page, RequestModel, ResponseModel
from app.schemas.lead import LeadRead

NoteBody = Annotated[
    str,
    StringConstraints(min_length=1, max_length=NOTE_MAX_LENGTH),
    Field(examples=["Sent pricing tiers PDF. She'll review with her CFO on Thursday."]),
]


class NoteCreate(RequestModel):
    body: NoteBody
    follow_up_at: datetime | None = Field(
        default=None,
        description="When to follow up, as ISO 8601 with a UTC offset",
        examples=["2026-05-05T10:00:00+05:30"],
    )

    @field_validator("follow_up_at")
    @classmethod
    def require_offset(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("Include a UTC offset, e.g. 2026-05-05T10:00:00+05:30.")
        return value

    def to_command(self) -> NewNote:
        return NewNote(body=self.body, follow_up_at=self.follow_up_at)


class ActivityRead(ResponseModel):
    id: UUID
    lead_id: UUID
    kind: ActivityKind
    body: str | None
    follow_up_at: datetime | None
    meta: dict[str, str | None] | None
    occurred_at: datetime


class ActivityPage(Page[ActivityRead]):
    pass


class NoteCreatedRead(ResponseModel):
    activity: ActivityRead
    lead: LeadRead
