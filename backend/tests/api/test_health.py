import httpx

from app.core.error_handlers import PROBLEM_MEDIA_TYPE


async def test_health_reports_database_ok(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    assert response.headers["X-Request-ID"]


async def test_health_echoes_incoming_request_id(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/health", headers={"X-Request-ID": "req-123"})

    assert response.headers["X-Request-ID"] == "req-123"


async def test_unknown_route_returns_problem_details(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/nope", headers={"X-Request-ID": "req-404"})

    assert response.status_code == 404
    assert response.headers["content-type"] == PROBLEM_MEDIA_TYPE
    body = response.json()
    assert body["type"] == "https://leadflow.dev/problems/not-found"
    assert body["title"] == "Not Found"
    assert body["status"] == 404
    assert body["instance"] == "/api/v1/nope"
    assert body["request_id"] == "req-404"
    assert body["errors"] == []


async def test_wrong_method_returns_405_problem(client: httpx.AsyncClient) -> None:
    response = await client.delete("/api/v1/health")

    assert response.status_code == 405
    assert response.headers["content-type"] == PROBLEM_MEDIA_TYPE
    assert response.json()["status"] == 405
    assert "GET" in response.headers["allow"]


async def test_openapi_documents_problem_media_type(client: httpx.AsyncClient) -> None:
    response = await client.get("/openapi.json")

    responses = response.json()["paths"]["/api/v1/health"]["get"]["responses"]
    assert "application/problem+json" in responses["503"]["content"]
