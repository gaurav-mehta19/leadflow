from collections.abc import AsyncIterator

import httpx
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api.dependencies import get_session
from app.core.error_handlers import PROBLEM_MEDIA_TYPE

UNREACHABLE_DATABASE_URL = "postgresql+asyncpg://nobody:nothing@127.0.0.1:1/missing"


async def test_unexpected_error_returns_generic_500_problem(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    async def explode() -> None:
        raise RuntimeError("secret internals")

    app.add_api_route("/api/v1/explode", explode)

    response = await client.get("/api/v1/explode", headers={"X-Request-ID": "req-500"})

    assert response.status_code == 500
    assert response.headers["content-type"] == PROBLEM_MEDIA_TYPE
    assert response.headers["X-Request-ID"] == "req-500"
    body = response.json()
    assert body["type"] == "https://leadflow.dev/problems/internal-error"
    assert body["request_id"] == "req-500"
    assert "secret" not in body["detail"]


async def test_health_returns_503_when_database_is_unreachable(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    broken_engine = create_async_engine(UNREACHABLE_DATABASE_URL)

    async def broken_session() -> AsyncIterator[AsyncSession]:
        async with AsyncSession(broken_engine) as session:
            yield session

    app.dependency_overrides[get_session] = broken_session
    try:
        response = await client.get("/api/v1/health")
    finally:
        await broken_engine.dispose()

    assert response.status_code == 503
    assert response.headers["content-type"] == PROBLEM_MEDIA_TYPE
    assert response.json()["type"] == "https://leadflow.dev/problems/service-unavailable"
