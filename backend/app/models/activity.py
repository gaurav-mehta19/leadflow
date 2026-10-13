from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.limits import NOTE_MAX_LENGTH
from app.domain.enums import ActivityKind
from app.models.base import Base, string_enum

ACTIVITY_KIND_VALUES = ", ".join(f"'{kind.value}'" for kind in ActivityKind)
ActivityMeta = dict[str, str | None]


class Activity(Base):
    __tablename__ = "activities"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        CheckConstraint(f"kind IN ({ACTIVITY_KIND_VALUES})", name="kind_valid"),
        CheckConstraint(
            f"kind <> 'note' OR (body IS NOT NULL AND char_length(body) BETWEEN 1 AND "
            f"{NOTE_MAX_LENGTH})",
            name="note_body_required",
        ),
        Index(
            "ix_activities_lead_id_occurred_at_id",
            "lead_id",
            text("occurred_at DESC"),
            text("id DESC"),
        ),
        Index(
            "ix_activities_lead_id_note_occurred_at",
            "lead_id",
            text("occurred_at DESC"),
            postgresql_where=text("kind = 'note'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    lead_id: Mapped[UUID] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"))
    kind: Mapped[ActivityKind] = mapped_column(string_enum(ActivityKind, 30))
    body: Mapped[str | None] = mapped_column(Text)
    follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    meta: Mapped[ActivityMeta | None] = mapped_column(JSONB)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
