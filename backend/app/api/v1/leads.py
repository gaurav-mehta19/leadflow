from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Query, Request, Response

from app.api.dependencies import LeadServiceDep, TimezoneDep
from app.api.openapi import problem_responses
from app.core.limits import CURSOR_MAX_LENGTH, LEADS_PAGE_DEFAULT, LEADS_PAGE_MAX, SEARCH_MAX_LENGTH
from app.domain.commands import LeadFilters
from app.domain.enums import LeadStatus
from app.schemas.lead import (
    FollowUpsRead,
    LeadCreate,
    LeadPage,
    LeadRead,
    LeadStatsRead,
    LeadUpdate,
    StatusCounts,
)

router = APIRouter(prefix="/leads", tags=["leads"])

StatusFilter = Annotated[LeadStatus | None, Query(description="Only leads in this status")]
SearchTerm = Annotated[
    str | None,
    Query(max_length=SEARCH_MAX_LENGTH, description="Matches name or company, case-insensitive"),
]
PageLimit = Annotated[int, Query(ge=1, le=LEADS_PAGE_MAX, description="Page size")]
Cursor = Annotated[
    str | None, Query(max_length=CURSOR_MAX_LENGTH, description="next_cursor from a previous page")
]


@router.get(
    "",
    summary="List leads, most recently active first",
    response_model=LeadPage,
    status_code=200,
    responses=problem_responses(400, 422),
)
async def list_leads(
    service: LeadServiceDep,
    zone: TimezoneDep,
    status: StatusFilter = None,
    q: SearchTerm = None,
    limit: PageLimit = LEADS_PAGE_DEFAULT,
    cursor: Cursor = None,
) -> LeadPage:
    page = await service.list_leads(LeadFilters(status=status, search=q), cursor, limit, zone)
    return LeadPage.model_validate(page)


@router.get(
    "/follow-ups",
    summary="Open leads with follow-ups that are overdue or due today",
    response_model=FollowUpsRead,
    status_code=200,
    responses=problem_responses(400, 422),
)
async def list_follow_ups(
    service: LeadServiceDep,
    zone: TimezoneDep,
    status: StatusFilter = None,
    q: SearchTerm = None,
) -> FollowUpsRead:
    follow_ups = await service.follow_ups(LeadFilters(status=status, search=q), zone)
    return FollowUpsRead.model_validate(follow_ups)


@router.get(
    "/stats",
    summary="Lead counts by status plus overdue and due-today follow-ups",
    response_model=LeadStatsRead,
    status_code=200,
    responses=problem_responses(400, 422),
)
async def read_lead_stats(
    service: LeadServiceDep, zone: TimezoneDep, q: SearchTerm = None
) -> LeadStatsRead:
    stats = await service.stats(q, zone)
    counts = {status.value: count for status, count in stats.by_status.items()}
    return LeadStatsRead(
        total=stats.total,
        by_status=StatusCounts(**counts),
        overdue=stats.overdue,
        due_today=stats.due_today,
    )


@router.post(
    "",
    summary="Create a lead",
    response_model=LeadRead,
    status_code=201,
    responses=problem_responses(400, 409, 422, duplicate_phone=True),
)
async def create_lead(
    payload: LeadCreate,
    request: Request,
    response: Response,
    service: LeadServiceDep,
    zone: TimezoneDep,
) -> LeadRead:
    lead = await service.create_lead(payload.to_command(), zone)
    response.headers["Location"] = str(request.app.url_path_for("get_lead", lead_id=str(lead.id)))
    return LeadRead.model_validate(lead)


@router.get(
    "/{lead_id}",
    summary="Get a lead",
    response_model=LeadRead,
    status_code=200,
    responses=problem_responses(400, 404, 422),
)
async def get_lead(lead_id: UUID, service: LeadServiceDep, zone: TimezoneDep) -> LeadRead:
    return LeadRead.model_validate(await service.get_lead(lead_id, zone))


@router.patch(
    "/{lead_id}",
    summary="Update a lead's details or status",
    response_model=LeadRead,
    status_code=200,
    responses=problem_responses(400, 404, 409, 422, duplicate_phone=True),
)
async def update_lead(
    lead_id: UUID,
    payload: Annotated[LeadUpdate, Body()],
    service: LeadServiceDep,
    zone: TimezoneDep,
) -> LeadRead:
    return LeadRead.model_validate(await service.update_lead(lead_id, payload.to_changes(), zone))


@router.post(
    "/{lead_id}/follow-up/complete",
    summary="Mark the lead's pending follow-up as done",
    response_model=LeadRead,
    status_code=200,
    responses=problem_responses(400, 404, 409, 422),
)
async def complete_follow_up(lead_id: UUID, service: LeadServiceDep, zone: TimezoneDep) -> LeadRead:
    return LeadRead.model_validate(await service.complete_follow_up(lead_id, zone))
