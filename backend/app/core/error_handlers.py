from collections.abc import Mapping, Sequence
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import InterfaceError, OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import PROBLEM_TYPE_BASE, AppError, FieldError
from app.core.logging import get_logger
from app.core.middleware import REQUEST_ID_HEADER

PROBLEM_MEDIA_TYPE = "application/problem+json"
_LOCATION_PREFIXES = frozenset({"body", "query", "path", "header", "cookie"})
_VALUE_ERROR_PREFIX = "Value error, "

logger = get_logger("app.errors")


def _request_id(request: Request) -> str | None:
    value = getattr(request.state, "request_id", None)
    return value if isinstance(value, str) else None


def problem_response(
    request: Request,
    *,
    status: int,
    type_slug: str,
    title: str,
    detail: str,
    errors: Sequence[FieldError] = (),
    extensions: Mapping[str, object] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    request_id = _request_id(request)
    body: dict[str, object] = {
        "type": f"{PROBLEM_TYPE_BASE}{type_slug}",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": request.url.path,
        "request_id": request_id,
        "errors": [{"field": error.field, "message": error.message} for error in errors],
        **(extensions or {}),
    }
    response_headers = dict(headers or {})
    if request_id:
        response_headers[REQUEST_ID_HEADER] = request_id
    return JSONResponse(
        content=jsonable_encoder(body),
        status_code=status,
        media_type=PROBLEM_MEDIA_TYPE,
        headers=response_headers,
    )


def _field_path(location: Sequence[int | str]) -> str:
    parts = list(location)
    if len(parts) > 1 and parts[0] in _LOCATION_PREFIXES:
        parts = parts[1:]
    return ".".join(str(part) for part in parts)


def _human_message(error: Mapping[str, Any]) -> str:
    error_type = str(error.get("type", ""))
    context = error.get("ctx") or {}
    message = str(error.get("msg", "Invalid value"))
    match error_type:
        case "missing":
            return "This field is required."
        case "string_too_short" | "too_short" if context.get("min_length") == 1:
            return "This field can't be empty."
        case "string_too_short" | "too_short":
            return f"Must be at least {context.get('min_length')} characters."
        case "string_too_long" | "too_long":
            return f"Must be at most {context.get('max_length')} characters."
        case "extra_forbidden":
            return "This field isn't allowed."
        case "json_invalid":
            return "The request body isn't valid JSON."
        case "uuid_parsing" | "uuid_type":
            return "Must be a valid UUID."
        case "enum" | "literal_error":
            return f"Must be one of: {context.get('expected', '')}."
        case "datetime_parsing" | "datetime_from_date_parsing" | "datetime_type":
            return "Must be an ISO 8601 date and time with a UTC offset."
        case "int_parsing" | "int_type":
            return "Must be a whole number."
        case "greater_than_equal":
            return f"Must be at least {context.get('ge')}."
        case "less_than_equal":
            return f"Must be at most {context.get('le')}."
    return message.removeprefix(_VALUE_ERROR_PREFIX)


async def handle_app_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, AppError):
        raise exc
    return problem_response(
        request,
        status=exc.status,
        type_slug=exc.type_slug,
        title=exc.title,
        detail=exc.detail,
        errors=exc.errors,
        extensions=exc.extensions,
    )


async def handle_request_validation_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):
        raise exc
    errors = [
        FieldError(field=_field_path(error.get("loc", ())), message=_human_message(error))
        for error in exc.errors()
    ]
    request_level = [error for error in errors if error.field in _LOCATION_PREFIXES]
    detail = (
        request_level[0].message
        if request_level and len(request_level) == len(errors)
        else "One or more fields are invalid."
    )
    return problem_response(
        request,
        status=422,
        type_slug="validation-error",
        title="Validation failed",
        detail=detail,
        errors=errors,
    )


_HTTP_DETAILS: dict[int, str] = {
    404: "The requested resource was not found.",
    405: "This method isn't allowed for this resource.",
}


async def handle_http_exception(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StarletteHTTPException):
        raise exc
    phrase = HTTPStatus(exc.status_code).phrase
    return problem_response(
        request,
        status=exc.status_code,
        type_slug=phrase.lower().replace(" ", "-"),
        title=phrase,
        detail=_HTTP_DETAILS.get(exc.status_code, phrase),
        headers=exc.headers,
    )


async def handle_database_unavailable(request: Request, exc: Exception) -> JSONResponse:
    logger.error("database.unavailable", error=type(exc).__name__, request_id=_request_id(request))
    return problem_response(
        request,
        status=503,
        type_slug="service-unavailable",
        title="Service unavailable",
        detail="The database is unreachable. Try again in a moment.",
    )


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("http.unhandled_error", request_id=_request_id(request), exc_info=exc)
    return problem_response(
        request,
        status=500,
        type_slug="internal-error",
        title="Internal server error",
        detail="Something went wrong on our side. Try again in a moment.",
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, handle_app_error)
    app.add_exception_handler(RequestValidationError, handle_request_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(OperationalError, handle_database_unavailable)
    app.add_exception_handler(InterfaceError, handle_database_unavailable)
    app.add_exception_handler(ConnectionRefusedError, handle_database_unavailable)
    app.add_exception_handler(Exception, handle_unexpected_error)
