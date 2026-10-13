from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response

from app.api.dependencies import ActivityServiceDep, TimezoneDep
from app.api.openapi import problem_responses
from app.core.limits import ACTIVITIES_PAGE_DEFAULT, ACTIVITIES_PAGE_MAX, CURSOR_MAX_LENGTH
from app.schemas.activity import ActivityPage, ActivityRead, NoteCreate, NoteCreatedRead

router = APIRouter(prefix="/leads/{lead_id}/activities", tags=["activities"])

PageLimit = Annotated[int, Query(ge=1, le=ACTIVITIES_PAGE_MAX, description="Page size")]
Cursor = Annotated[
    str | None, Query(max_length=CURSOR_MAX_LENGTH, description="next_cursor from a previous page")
]


@router.get(
    "",
    summary="List a lead's timeline, newest first",
    response_model=ActivityPage,
    status_code=200,
    responses=problem_responses(400, 404, 422),
)
async def list_activities(
    lead_id: UUID,
    service: ActivityServiceDep,
    limit: PageLimit = ACTIVITIES_PAGE_DEFAULT,
    cursor: Cursor = None,
) -> ActivityPage:
    return ActivityPage.model_validate(await service.list_activities(lead_id, cursor, limit))


@router.post(
    "",
    summary="Log a discussion note, optionally setting the next follow-up",
    response_model=NoteCreatedRead,
    status_code=201,
    responses=problem_responses(400, 404, 422),
)
async def log_note(
    lead_id: UUID,
    payload: NoteCreate,
    request: Request,
    response: Response,
    service: ActivityServiceDep,
    zone: TimezoneDep,
) -> NoteCreatedRead:
    logged = await service.log_note(lead_id, payload.to_command(), zone)
    response.headers["Location"] = str(
        request.app.url_path_for(
            "get_activity", lead_id=str(lead_id), activity_id=str(logged.activity.id)
        )
    )
    return NoteCreatedRead.model_validate(logged)


@router.get(
    "/{activity_id}",
    summary="Get one timeline entry",
    response_model=ActivityRead,
    status_code=200,
    responses=problem_responses(404, 422),
)
async def get_activity(
    lead_id: UUID, activity_id: UUID, service: ActivityServiceDep
) -> ActivityRead:
    return ActivityRead.model_validate(await service.get_activity(lead_id, activity_id))
