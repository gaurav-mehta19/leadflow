from uuid import UUID

from app.core.errors import ConflictError, DomainValidationError, FieldError, NotFoundError


class LeadNotFoundError(NotFoundError):
    default_type_slug = "lead-not-found"
    default_title = "Lead not found"

    def __init__(self, lead_id: UUID) -> None:
        super().__init__(f"No lead exists with id {lead_id}.")


class ActivityNotFoundError(NotFoundError):
    default_type_slug = "activity-not-found"
    default_title = "Activity not found"

    def __init__(self, activity_id: UUID) -> None:
        super().__init__(f"No activity exists with id {activity_id} for this lead.")


class DuplicatePhoneError(ConflictError):
    default_type_slug = "duplicate-phone"
    default_title = "Duplicate phone number"

    def __init__(self, existing_lead_id: UUID, existing_lead_name: str) -> None:
        super().__init__(
            "A lead with this phone number already exists.",
            errors=[FieldError("phone", f"Already used by {existing_lead_name}")],
            extensions={
                "existing_lead_id": existing_lead_id,
                "existing_lead_name": existing_lead_name,
            },
        )


class NoPendingFollowUpError(ConflictError):
    default_type_slug = "no-pending-follow-up"
    default_title = "No pending follow-up"

    def __init__(self) -> None:
        super().__init__("This lead has no follow-up to complete.")


class FollowUpNotAllowedError(DomainValidationError):
    def __init__(self, message: str) -> None:
        super().__init__(
            "The follow-up time is invalid.",
            errors=[FieldError("follow_up_at", message)],
        )
