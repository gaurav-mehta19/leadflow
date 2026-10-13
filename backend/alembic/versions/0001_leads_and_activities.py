from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LEAD_STATUSES = "'new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'"
ACTIVITY_KINDS = "'note', 'lead_created', 'status_changed', 'follow_up_completed'"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "leads",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("company", sa.String(length=120), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("phone_normalized", sa.String(length=16), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="new", nullable=False),
        sa.Column("next_follow_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_activity_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(f"status IN ({LEAD_STATUSES})", name=op.f("ck_leads_status_valid")),
        sa.CheckConstraint(
            "char_length(name) BETWEEN 1 AND 120", name=op.f("ck_leads_name_length")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_leads")),
    )
    op.create_index(
        "ix_leads_last_activity_at_id",
        "leads",
        [sa.text("last_activity_at DESC"), sa.text("id DESC")],
    )
    op.create_index("ix_leads_status", "leads", ["status"])
    op.create_index(
        "ix_leads_next_follow_up_at",
        "leads",
        ["next_follow_up_at"],
        postgresql_where=sa.text("next_follow_up_at IS NOT NULL"),
    )
    op.create_index(
        "uq_leads_phone_normalized",
        "leads",
        ["phone_normalized"],
        unique=True,
        postgresql_where=sa.text("phone_normalized IS NOT NULL"),
    )
    op.create_index(
        "ix_leads_name_trgm",
        "leads",
        [sa.text("lower(name) gin_trgm_ops")],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_leads_company_trgm",
        "leads",
        [sa.text("lower(company) gin_trgm_ops")],
        postgresql_using="gin",
    )

    op.create_table(
        "activities",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("lead_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=30), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meta", postgresql.JSONB(), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(f"kind IN ({ACTIVITY_KINDS})", name=op.f("ck_activities_kind_valid")),
        sa.CheckConstraint(
            "kind <> 'note' OR (body IS NOT NULL AND char_length(body) BETWEEN 1 AND 5000)",
            name=op.f("ck_activities_note_body_required"),
        ),
        sa.ForeignKeyConstraint(
            ["lead_id"],
            ["leads.id"],
            name=op.f("fk_activities_lead_id_leads"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activities")),
    )
    op.create_index(
        "ix_activities_lead_id_occurred_at_id",
        "activities",
        ["lead_id", sa.text("occurred_at DESC"), sa.text("id DESC")],
    )
    op.create_index(
        "ix_activities_lead_id_note_occurred_at",
        "activities",
        ["lead_id", sa.text("occurred_at DESC")],
        postgresql_where=sa.text("kind = 'note'"),
    )


def downgrade() -> None:
    op.drop_table("activities")
    op.drop_table("leads")
