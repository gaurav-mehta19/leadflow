from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.limits import COMPANY_MAX_LENGTH, NAME_MAX_LENGTH, PHONE_MAX_LENGTH
from app.domain.enums import LeadStatus
from app.models.base import Base, string_enum

LEAD_STATUS_VALUES = ", ".join(f"'{status.value}'" for status in LeadStatus)


class Lead(Base):
    __tablename__ = "leads"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        CheckConstraint(f"status IN ({LEAD_STATUS_VALUES})", name="status_valid"),
        CheckConstraint("char_length(name) BETWEEN 1 AND 120", name="name_length"),
        Index("ix_leads_last_activity_at_id", text("last_activity_at DESC"), text("id DESC")),
        Index("ix_leads_status", "status"),
        Index(
            "ix_leads_next_follow_up_at",
            "next_follow_up_at",
            postgresql_where=text("next_follow_up_at IS NOT NULL"),
        ),
        Index(
            "uq_leads_phone_normalized",
            "phone_normalized",
            unique=True,
            postgresql_where=text("phone_normalized IS NOT NULL"),
        ),
        Index("ix_leads_name_trgm", text("lower(name) gin_trgm_ops"), postgresql_using="gin"),
        Index("ix_leads_company_trgm", text("lower(company) gin_trgm_ops"), postgresql_using="gin"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    company: Mapped[str | None] = mapped_column(String(COMPANY_MAX_LENGTH))
    phone: Mapped[str | None] = mapped_column(String(PHONE_MAX_LENGTH))
    phone_normalized: Mapped[str | None] = mapped_column(String(16))
    status: Mapped[LeadStatus] = mapped_column(
        string_enum(LeadStatus, 20), server_default=LeadStatus.NEW.value, default=LeadStatus.NEW
    )
    next_follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
