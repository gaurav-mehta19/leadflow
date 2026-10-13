from fastapi import APIRouter

from app.api.dependencies import HealthServiceDep
from app.api.openapi import problem_responses
from app.schemas.health import HealthRead

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Check API and database health",
    response_model=HealthRead,
    status_code=200,
    responses=problem_responses(503),
)
async def read_health(service: HealthServiceDep) -> HealthRead:
    await service.check_database()
    return HealthRead(status="ok", database="ok")
