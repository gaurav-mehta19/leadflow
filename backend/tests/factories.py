from datetime import datetime
from typing import Any

import httpx

LEADS_URL = "/api/v1/leads"

JsonObject = dict[str, Any]


def lead_url(lead_id: str) -> str:
    return f"{LEADS_URL}/{lead_id}"


def activities_url(lead_id: str) -> str:
    return f"{LEADS_URL}/{lead_id}/activities"


async def create_lead(
    client: httpx.AsyncClient, name: str = "Test Lead", **fields: Any
) -> JsonObject:
    response = await client.post(LEADS_URL, json={"name": name, **fields})
    assert response.status_code == 201, response.text
    lead: JsonObject = response.json()
    return lead


async def log_note(
    client: httpx.AsyncClient,
    lead_id: str,
    body: str = "Discovery call. Wants a pilot for one branch.",
    follow_up_at: datetime | None = None,
) -> JsonObject:
    payload: JsonObject = {"body": body}
    if follow_up_at is not None:
        payload["follow_up_at"] = follow_up_at.isoformat()
    response = await client.post(activities_url(lead_id), json=payload)
    assert response.status_code == 201, response.text
    created: JsonObject = response.json()
    return created


async def change_status(client: httpx.AsyncClient, lead_id: str, status: str) -> JsonObject:
    response = await client.patch(lead_url(lead_id), json={"status": status})
    assert response.status_code == 200, response.text
    lead: JsonObject = response.json()
    return lead


async def timeline(client: httpx.AsyncClient, lead_id: str) -> list[JsonObject]:
    response = await client.get(activities_url(lead_id))
    assert response.status_code == 200, response.text
    items: list[JsonObject] = response.json()["items"]
    return items


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value)
