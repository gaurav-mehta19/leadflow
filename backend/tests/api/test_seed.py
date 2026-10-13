from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import FixedClock
from app.scripts.seed import seed_demo_data
from tests.factories import LEADS_URL, timeline

KOLKATA = ZoneInfo("Asia/Kolkata")


@pytest.mark.parametrize(
    "local_now",
    [
        datetime(2026, 5, 4, 0, 2, tzinfo=KOLKATA),
        datetime(2026, 5, 4, 9, 30, tzinfo=KOLKATA),
        datetime(2026, 5, 4, 23, 52, tzinfo=KOLKATA),
    ],
)
async def test_seed_covers_every_demo_scenario_at_any_time_of_day(
    session: AsyncSession, client: httpx.AsyncClient, clock: FixedClock, local_now: datetime
) -> None:
    clock.set(local_now)

    created = await seed_demo_data(session, clock.now(), KOLKATA)

    leads = (await client.get(LEADS_URL)).json()["items"]
    follow_ups = (await client.get(f"{LEADS_URL}/follow-ups")).json()
    stats = (await client.get(f"{LEADS_URL}/stats")).json()
    by_name = {lead["name"]: lead for lead in leads}
    assert created == len(leads) == 10
    assert all(count >= 1 for count in stats["by_status"].values())
    assert [lead["name"] for lead in follow_ups["overdue"]] == ["Rohan Mehta", "Ananya Iyer"]
    assert [lead["name"] for lead in follow_ups["today"]] == ["Priya Sharma", "Daniel Okafor"]
    assert sorted(lead["name"] for lead in leads if lead["follow_up_state"] == "upcoming") == [
        "Arjun Kapoor",
        "Meera Nair",
    ]
    assert sorted(lead["name"] for lead in leads if lead["is_stale"]) == [
        "Neha Gupta",
        "Rohan Mehta",
    ]
    assert by_name["Vikram Rao"]["company"] is None
    assert by_name["Vikram Rao"]["phone"] is None
    assert by_name["Neha Gupta"]["last_note"] is None
    neha_events = await timeline(client, by_name["Neha Gupta"]["id"])
    assert [event["kind"] for event in neha_events] == ["lead_created"]
    sara_events = await timeline(client, by_name["Sara Lindqvist"]["id"])
    assert sara_events[0]["meta"]["to"] == "won"
    assert sara_events[0]["meta"]["cleared_follow_up_at"] is not None
