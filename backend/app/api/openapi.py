from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.core.error_handlers import PROBLEM_MEDIA_TYPE
from app.schemas.problem import DuplicatePhoneProblem, Problem

JSON_MEDIA_TYPE = "application/json"

_DESCRIPTIONS: dict[int, str] = {
    400: "Bad request, such as an invalid cursor or X-Timezone header",
    404: "Resource not found",
    409: "Conflict with the current state of the resource",
    422: "Validation failed; see errors[] for field messages",
    503: "A dependency, usually the database, is unavailable",
}

OPENAPI_TAGS: list[dict[str, str]] = [
    {"name": "health", "description": "Liveness and database connectivity"},
    {"name": "leads", "description": "Leads, filters, follow-ups and pipeline status"},
    {"name": "activities", "description": "Discussion notes and timeline events"},
]


def problem_responses(*statuses: int, duplicate_phone: bool = False) -> dict[int | str, Any]:
    responses: dict[int | str, Any] = {}
    for status in statuses:
        model = DuplicatePhoneProblem if duplicate_phone and status == 409 else Problem
        responses[status] = {"model": model, "description": _DESCRIPTIONS[status]}
    return responses


def _use_problem_media_type(schema: dict[str, Any]) -> None:
    for operations in schema.get("paths", {}).values():
        for operation in operations.values():
            for status, response in operation.get("responses", {}).items():
                content = response.get("content", {})
                if status.isdigit() and int(status) >= 400 and JSON_MEDIA_TYPE in content:
                    content[PROBLEM_MEDIA_TYPE] = content.pop(JSON_MEDIA_TYPE)


class LeadFlowApp(FastAPI):
    def openapi(self) -> dict[str, Any]:
        if self.openapi_schema is None:
            schema = get_openapi(
                title=self.title,
                version=self.version,
                description=self.description,
                routes=self.routes,
                tags=self.openapi_tags,
            )
            _use_problem_media_type(schema)
            self.openapi_schema = schema
        return self.openapi_schema
