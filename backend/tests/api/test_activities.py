from datetime import UTC, timedelta, timezone

import httpx
import pytest

from app.core.clock import FixedClock
from tests.api.test_leads import assert_problem, field_errors
from tests.conftest import FROZEN_NOW
from tests.factories import (
    activities_url,
    change_status,
    create_lead,
    lead_url,
    log_note,
    parse_time,
    timeline,
)

UNKNOWN_LEAD = "00000000-0000-4000-8000-000000000000"


class TestLogNote:
    async def test_logs_a_note_and_updates_the_lead(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(minutes=5))

        response = await client.post(
            activities_url(lead["id"]),
            json={"body": "  Discovery call.\n40 advisors, losing track of follow-ups.  "},
        )

        assert response.status_code == 201
        body = response.json()
        activity = body["activity"]
        assert response.headers["Location"] == (
            f"/api/v1/leads/{lead['id']}/activities/{activity['id']}"
        )
        assert activity["kind"] == "note"
        assert activity["body"] == "Discovery call.\n40 advisors, losing track of follow-ups."
        assert activity["follow_up_at"] is None
        assert parse_time(activity["occurred_at"]) == clock.now()
        assert body["lead"]["last_note"]["preview"] == (
            "Discovery call. 40 advisors, losing track of follow-ups."
        )
        assert parse_time(body["lead"]["last_activity_at"]) == clock.now()

    async def test_location_points_to_the_activity(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)
        created = await client.post(activities_url(lead["id"]), json={"body": "Called"})

        fetched = await client.get(created.headers["Location"])

        assert fetched.status_code == 200
        assert fetched.json() == created.json()["activity"]

    async def test_follow_up_updates_the_lead_in_utc(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)
        ist = timezone(timedelta(hours=5, minutes=30))
        due = (FROZEN_NOW + timedelta(hours=2)).astimezone(ist)

        created = await log_note(client, lead["id"], follow_up_at=due)

        assert created["activity"]["follow_up_at"] == "2026-05-04T08:30:00Z"
        assert created["lead"]["next_follow_up_at"] == "2026-05-04T08:30:00Z"
        assert created["lead"]["follow_up_state"] == "today"

    async def test_new_follow_up_replaces_the_previous_one(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        await log_note(client, lead["id"], follow_up_at=FROZEN_NOW + timedelta(days=1))
        clock.advance(timedelta(minutes=1))
        replacement = FROZEN_NOW + timedelta(days=7)

        created = await log_note(client, lead["id"], follow_up_at=replacement)

        assert parse_time(created["lead"]["next_follow_up_at"]) == replacement
        assert created["lead"]["follow_up_state"] == "upcoming"

    async def test_note_without_follow_up_keeps_the_existing_one(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        due = FROZEN_NOW + timedelta(days=1)
        await log_note(client, lead["id"], follow_up_at=due)
        clock.advance(timedelta(minutes=1))

        created = await log_note(client, lead["id"], body="Quick check-in")

        assert parse_time(created["lead"]["next_follow_up_at"]) == due

    @pytest.mark.parametrize(
        ("follow_up_at", "message"),
        [
            ("2026-05-05T10:00:00", "Include a UTC offset, e.g. 2026-05-05T10:00:00+05:30."),
            ("tomorrow", "Must be an ISO 8601 date and time with a UTC offset."),
            (
                (FROZEN_NOW - timedelta(minutes=2)).isoformat(),
                "Pick a time in the future.",
            ),
            (
                (FROZEN_NOW + timedelta(days=366)).isoformat(),
                "Pick a time within the next 365 days.",
            ),
        ],
    )
    async def test_invalid_follow_up_times_are_422(
        self, client: httpx.AsyncClient, follow_up_at: str, message: str
    ) -> None:
        lead = await create_lead(client)

        response = await client.post(
            activities_url(lead["id"]), json={"body": "Called", "follow_up_at": follow_up_at}
        )

        assert_problem(response, 422, "validation-error")
        assert field_errors(response) == {"follow_up_at": message}

    async def test_a_follow_up_a_few_seconds_in_the_past_is_accepted(
        self, client: httpx.AsyncClient
    ) -> None:
        lead = await create_lead(client)

        created = await log_note(
            client, lead["id"], follow_up_at=FROZEN_NOW - timedelta(seconds=30)
        )

        assert created["lead"]["follow_up_state"] == "today"

    async def test_closed_leads_cannot_get_a_follow_up(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(minutes=1))
        await change_status(client, lead["id"], "won")

        response = await client.post(
            activities_url(lead["id"]),
            json={"body": "Renewal", "follow_up_at": (clock.now() + timedelta(days=1)).isoformat()},
        )

        assert_problem(response, 422, "validation-error")
        assert field_errors(response) == {
            "follow_up_at": "Move this lead back to an open stage to schedule a follow-up."
        }

    async def test_closed_leads_still_accept_notes(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(minutes=1))
        await change_status(client, lead["id"], "lost")

        created = await log_note(client, lead["id"], body="Chose a competitor on price.")

        assert created["lead"]["status"] == "lost"

    @pytest.mark.parametrize(
        ("payload", "message"),
        [
            ({}, "This field is required."),
            ({"body": "   \n  "}, "This field can't be empty."),
            ({"body": "x" * 5001}, "Must be at most 5000 characters."),
        ],
    )
    async def test_invalid_body_is_422(
        self, client: httpx.AsyncClient, payload: dict[str, object], message: str
    ) -> None:
        lead = await create_lead(client)

        response = await client.post(activities_url(lead["id"]), json=payload)

        assert_problem(response, 422, "validation-error")
        assert field_errors(response) == {"body": message}

    async def test_body_of_exactly_5000_characters_is_accepted(
        self, client: httpx.AsyncClient
    ) -> None:
        lead = await create_lead(client)

        created = await log_note(client, lead["id"], body="x" * 5000)

        assert len(created["lead"]["last_note"]["preview"]) <= 160

    async def test_unknown_lead_is_404(self, client: httpx.AsyncClient) -> None:
        response = await client.post(activities_url(UNKNOWN_LEAD), json={"body": "Hello"})

        assert_problem(response, 404, "lead-not-found")


class TestTimeline:
    async def test_lists_newest_first_with_pagination(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        for minute in range(1, 4):
            clock.set(FROZEN_NOW + timedelta(minutes=minute))
            await log_note(client, lead["id"], body=f"Note {minute}")

        first = (await client.get(activities_url(lead["id"]), params={"limit": 2})).json()
        second = (
            await client.get(
                activities_url(lead["id"]), params={"limit": 2, "cursor": first["next_cursor"]}
            )
        ).json()

        assert [item["body"] for item in first["items"]] == ["Note 3", "Note 2"]
        assert [item["body"] for item in second["items"]] == ["Note 1", None]
        assert second["items"][1]["kind"] == "lead_created"
        assert second["next_cursor"] is None

    async def test_default_page_holds_50_items(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        for second in range(1, 51):
            clock.set(FROZEN_NOW + timedelta(seconds=second))
            await log_note(client, lead["id"], body=f"Note {second}")

        page = (await client.get(activities_url(lead["id"]))).json()

        assert len(page["items"]) == 50
        assert page["next_cursor"] is not None

    async def test_unknown_lead_is_404(self, client: httpx.AsyncClient) -> None:
        response = await client.get(activities_url(UNKNOWN_LEAD))

        assert_problem(response, 404, "lead-not-found")

    async def test_malformed_cursor_is_400(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)

        response = await client.get(activities_url(lead["id"]), params={"cursor": "%%%"})

        assert_problem(response, 400, "invalid-cursor")

    async def test_activity_of_another_lead_is_404(self, client: httpx.AsyncClient) -> None:
        first = await create_lead(client, name="First")
        second = await create_lead(client, name="Second")
        note = await log_note(client, first["id"])

        response = await client.get(f"{activities_url(second['id'])}/{note['activity']['id']}")

        assert_problem(response, 404, "activity-not-found")

    async def test_preserves_line_breaks_and_returns_utc(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(seconds=1))
        await log_note(client, lead["id"], body="Line one\nLine two")

        events = await timeline(client, lead["id"])
        fetched = (await client.get(lead_url(lead["id"]))).json()

        assert events[0]["body"] == "Line one\nLine two"
        assert parse_time(fetched["last_note"]["occurred_at"]).tzinfo == UTC
