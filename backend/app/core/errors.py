from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import ClassVar

PROBLEM_TYPE_BASE = "https://leadflow.dev/problems/"


@dataclass(frozen=True, slots=True)
class FieldError:
    field: str
    message: str


class AppError(Exception):
    status: ClassVar[int] = 500
    default_type_slug: ClassVar[str] = "internal-error"
    default_title: ClassVar[str] = "Internal server error"

    def __init__(
        self,
        detail: str,
        *,
        title: str | None = None,
        type_slug: str | None = None,
        errors: Sequence[FieldError] = (),
        extensions: Mapping[str, object] | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.title = title or self.default_title
        self.type_slug = type_slug or self.default_type_slug
        self.errors = tuple(errors)
        self.extensions = dict(extensions or {})


class BadRequestError(AppError):
    status = 400
    default_type_slug = "bad-request"
    default_title = "Bad request"


class NotFoundError(AppError):
    status = 404
    default_type_slug = "not-found"
    default_title = "Not found"


class ConflictError(AppError):
    status = 409
    default_type_slug = "conflict"
    default_title = "Conflict"


class DomainValidationError(AppError):
    status = 422
    default_type_slug = "validation-error"
    default_title = "Validation failed"


class ServiceUnavailableError(AppError):
    status = 503
    default_type_slug = "service-unavailable"
    default_title = "Service unavailable"
