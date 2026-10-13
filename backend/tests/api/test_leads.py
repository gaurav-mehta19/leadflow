from datetime import timedelta

import httpx
import pytest

from app.core.clock import FixedClock
from app.core.error_handlers import PROBLEM_MEDIA_TYPE
from tests.conftest import FROZEN_NOW
from tests.factories import (
    LEADS_URL,
    change_status,
    create_lead,
    lead_url,
    log_note,
    parse_time,
    timeline,
)


def assert_problem(response: httpx.Response, status: int, type_slug: str) -> dict[str, object]:
    assert response.status_code == status, response.text
    assert response.headers["content-type"] == PROBLEM_MEDIA_TYPE
    body: dict[str, object] = response.json()
    assert body["type"] == f"https://leadflow.dev/problems/{type_slug}"
    assert body["status"] == status
    assert body["request_id"] == response.headers["X-Request-ID"]
    return body


def field_errors(response: httpx.Response) -> dict[str, str]:
    return {error["field"]: error["message"] for error in response.json()["errors"]}


class TestCreateLead:
    async def test_name_only_creates_a_new_lead(self, client: httpx.AsyncClient) -> None:
        response = await client.post(LEADS_URL, json={"name": "Vikram Rao"})

        assert response.status_code == 201
        lead = response.json()
        assert response.headers["Location"] == f"/api/v1/leads/{lead['id']}"
        assert lead["name"] == "Vikram Rao"
        assert lead["status"] == "new"
        assert lead["company"] is None
        assert lead["phone"] is None
        assert lead["follow_up_state"] == "none"
        assert lead["last_note"] is None
        assert parse_time(lead["last_activity_at"]) == FROZEN_NOW
        assert parse_time(lead["created_at"]) == FROZEN_NOW

    async def test_creation_is_logged_on_the_timeline(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)

        events = await timeline(client, lead["id"])

        assert [event["kind"] for event in events] == ["lead_created"]

    async def test_inputs_are_trimmed_and_blank_company_becomes_null(
        self, client: httpx.AsyncClient
    ) -> None:
        lead = await create_lead(
            client, name="  Ananya \n  Iyer ", company="   ", phone=" 98765 43210 "
        )

        assert lead["name"] == "Ananya Iyer"
        assert lead["company"] is None
        assert lead["phone"] == "98765 43210"

    @pytest.mark.parametrize(
        ("payload", "field", "message"),
        [
            ({}, "name", "This field is required."),
            ({"name": "   "}, "name", "This field can't be empty."),
            ({"name": "x" * 121}, "name", "Must be at most 120 characters."),
            ({"name": "A", "company": "c" * 121}, "company", "Must be at most 120 characters."),
            ({"name": "A", "phone": "12345"}, "phone", "Enter a phone number with 7 to 15 digits."),
            ({"name": "A", "status": "won"}, "status", "This field isn't allowed."),
        ],
    )
    async def test_invalid_input_returns_field_errors(
        self, client: httpx.AsyncClient, payload: dict[str, object], field: str, message: str
    ) -> None:
        response = await client.post(LEADS_URL, json=payload)

        assert_problem(response, 422, "validation-error")
        assert field_errors(response)[field] == message

    async def test_malformed_json_is_a_422_problem(self, client: httpx.AsyncClient) -> None:
        response = await client.post(
            LEADS_URL, content="{not json", headers={"Content-Type": "application/json"}
        )

        assert_problem(response, 422, "validation-error")

    async def test_duplicate_phone_returns_409_with_existing_lead(
        self, client: httpx.AsyncClient
    ) -> None:
        existing = await create_lead(client, name="Ananya Iyer", phone="+91 98765 43210")

        response = await client.post(
            LEADS_URL, json={"name": "Someone", "phone": "+91-98765-43210"}
        )

        body = assert_problem(response, 409, "duplicate-phone")
        assert body["title"] == "Duplicate phone number"
        assert body["existing_lead_id"] == existing["id"]
        assert body["existing_lead_name"] == "Ananya Iyer"
        assert field_errors(response) == {"phone": "Already used by Ananya Iyer"}

    async def test_names_may_repeat(self, client: httpx.AsyncClient) -> None:
        await create_lead(client, name="Neha Gupta")

        response = await client.post(LEADS_URL, json={"name": "Neha Gupta"})

        assert response.status_code == 201


class TestGetLead:
    async def test_returns_the_lead(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client, name="Meera Nair")

        response = await client.get(lead_url(lead["id"]))

        assert response.status_code == 200
        assert response.json()["name"] == "Meera Nair"

    async def test_unknown_lead_is_404(self, client: httpx.AsyncClient) -> None:
        response = await client.get(lead_url("00000000-0000-4000-8000-000000000000"))

        assert_problem(response, 404, "lead-not-found")

    async def test_malformed_id_is_422(self, client: httpx.AsyncClient) -> None:
        response = await client.get(lead_url("nope"))

        assert_problem(response, 422, "validation-error")
        assert field_errors(response) == {"lead_id": "Must be a valid UUID."}


class TestUpdateLead:
    async def test_empty_body_is_rejected(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)

        response = await client.patch(lead_url(lead["id"]), json={})

        body = assert_problem(response, 422, "validation-error")
        assert body["detail"] == "Provide at least one field"

    async def test_null_name_is_rejected(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)

        response = await client.patch(lead_url(lead["id"]), json={"name": None})

        assert_problem(response, 422, "validation-error")
        assert field_errors(response) == {"name": "This field can't be null."}

    async def test_unknown_status_is_rejected(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)

        response = await client.patch(lead_url(lead["id"]), json={"status": "archived"})

        assert_problem(response, 422, "validation-error")
        assert "status" in field_errors(response)

    async def test_updates_details_and_clears_company(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client, name="Rohan", company="Northstar")
        clock.advance(timedelta(minutes=5))

        response = await client.patch(
            lead_url(lead["id"]), json={"name": "Rohan Mehta", "company": "", "phone": "9876500000"}
        )

        assert response.status_code == 200
        updated = response.json()
        assert updated["name"] == "Rohan Mehta"
        assert updated["company"] is None
        assert updated["phone"] == "9876500000"
        assert parse_time(updated["updated_at"]) == clock.now()

    async def test_unknown_lead_is_404(self, client: httpx.AsyncClient) -> None:
        response = await client.patch(
            lead_url("00000000-0000-4000-8000-000000000000"), json={"name": "X"}
        )

        assert_problem(response, 404, "lead-not-found")

    async def test_phone_used_by_another_lead_is_409(self, client: httpx.AsyncClient) -> None:
        owner = await create_lead(client, name="Priya Sharma", phone="+91 99999 11111")
        other = await create_lead(client, name="Daniel Okafor")

        response = await client.patch(lead_url(other["id"]), json={"phone": "+919999911111"})

        body = assert_problem(response, 409, "duplicate-phone")
        assert body["existing_lead_id"] == owner["id"]

    async def test_reformatting_own_phone_is_allowed(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client, phone="+91 99999 11111")

        response = await client.patch(lead_url(lead["id"]), json={"phone": "+91-99999-11111"})

        assert response.status_code == 200
        assert response.json()["phone"] == "+91-99999-11111"

    async def test_status_change_writes_a_timeline_event(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(minutes=1))

        updated = await change_status(client, lead["id"], "qualified")

        assert updated["status"] == "qualified"
        assert parse_time(updated["last_activity_at"]) == clock.now()
        latest = (await timeline(client, lead["id"]))[0]
        assert latest["kind"] == "status_changed"
        assert latest["meta"] == {"from": "new", "to": "qualified", "cleared_follow_up_at": None}

    async def test_same_status_is_a_no_op(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(minutes=1))

        updated = await change_status(client, lead["id"], "new")

        assert updated["updated_at"] == lead["updated_at"]
        assert len(await timeline(client, lead["id"])) == 1

    async def test_closing_a_lead_clears_its_follow_up(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        due = FROZEN_NOW + timedelta(days=1)
        await log_note(client, lead["id"], follow_up_at=due)
        clock.advance(timedelta(minutes=1))

        won = await change_status(client, lead["id"], "won")

        assert won["next_follow_up_at"] is None
        assert won["follow_up_state"] == "none"
        event = (await timeline(client, lead["id"]))[0]
        assert parse_time(event["meta"]["cleared_follow_up_at"]) == due

    async def test_undo_within_30_seconds_removes_the_event_and_restores_follow_up(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(seconds=1))
        due = FROZEN_NOW + timedelta(days=1)
        noted = await log_note(client, lead["id"], follow_up_at=due)
        clock.advance(timedelta(minutes=1))
        await change_status(client, lead["id"], "lost")
        clock.advance(timedelta(seconds=10))

        restored = await change_status(client, lead["id"], "new")

        assert restored["status"] == "new"
        assert parse_time(restored["next_follow_up_at"]) == due
        assert restored["last_activity_at"] == noted["activity"]["occurred_at"]
        assert [event["kind"] for event in await timeline(client, lead["id"])] == [
            "note",
            "lead_created",
        ]

    async def test_reverting_after_30_seconds_writes_a_new_event(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(minutes=1))
        await change_status(client, lead["id"], "contacted")
        clock.advance(timedelta(seconds=30))

        await change_status(client, lead["id"], "new")

        kinds = [event["kind"] for event in await timeline(client, lead["id"])]
        assert kinds == ["status_changed", "status_changed", "lead_created"]

    async def test_undo_only_applies_to_the_latest_activity(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(seconds=1))
        await change_status(client, lead["id"], "contacted")
        clock.advance(timedelta(seconds=1))
        await log_note(client, lead["id"])
        clock.advance(timedelta(seconds=1))

        await change_status(client, lead["id"], "new")

        kinds = [event["kind"] for event in await timeline(client, lead["id"])]
        assert kinds == ["status_changed", "note", "status_changed", "lead_created"]


class TestListLeads:
    async def test_orders_by_last_activity_and_paginates(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        first = await create_lead(client, name="First")
        clock.advance(timedelta(minutes=1))
        second = await create_lead(client, name="Second")
        clock.advance(timedelta(minutes=1))
        third = await create_lead(client, name="Third")
        clock.advance(timedelta(minutes=1))
        await log_note(client, first["id"])

        page_one = (await client.get(LEADS_URL, params={"limit": 2})).json()
        page_two = (
            await client.get(LEADS_URL, params={"limit": 2, "cursor": page_one["next_cursor"]})
        ).json()

        assert [lead["id"] for lead in page_one["items"]] == [first["id"], third["id"]]
        assert page_one["next_cursor"]
        assert [lead["id"] for lead in page_two["items"]] == [second["id"]]
        assert page_two["next_cursor"] is None

    async def test_last_note_is_the_latest_note_not_the_latest_event(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(minutes=1))
        await log_note(client, lead["id"], body="Older note")
        clock.advance(timedelta(minutes=1))
        await log_note(client, lead["id"], body="Sent pricing.\n\nShe'll review   with her CFO.")
        clock.advance(timedelta(minutes=1))
        await change_status(client, lead["id"], "contacted")

        listed = (await client.get(LEADS_URL)).json()["items"][0]

        assert listed["last_note"]["preview"] == "Sent pricing. She'll review with her CFO."
        assert parse_time(listed["last_note"]["occurred_at"]) == FROZEN_NOW + timedelta(minutes=2)

    async def test_filters_by_status(self, client: httpx.AsyncClient, clock: FixedClock) -> None:
        lead = await create_lead(client, name="Qualified one")
        await create_lead(client, name="Still new")
        clock.advance(timedelta(minutes=1))
        await change_status(client, lead["id"], "qualified")

        items = (await client.get(LEADS_URL, params={"status": "qualified"})).json()["items"]

        assert [item["name"] for item in items] == ["Qualified one"]

    async def test_searches_name_and_company_case_insensitively(
        self, client: httpx.AsyncClient
    ) -> None:
        await create_lead(client, name="Sara Lindqvist", company="Fjord Asset Management")
        await create_lead(client, name="Kabir Singh", company="Banyan Tree Advisory")

        by_name = (await client.get(LEADS_URL, params={"q": "  lindQ "})).json()["items"]
        by_company = (await client.get(LEADS_URL, params={"q": "banyan"})).json()["items"]

        assert [item["name"] for item in by_name] == ["Sara Lindqvist"]
        assert [item["name"] for item in by_company] == ["Kabir Singh"]

    @pytest.mark.parametrize("term", ["%", "_", "\\"])
    async def test_search_escapes_wildcards(self, client: httpx.AsyncClient, term: str) -> None:
        await create_lead(client, name="Plain Name")
        await create_lead(client, name="Discount 100% Off_Now")

        items = (await client.get(LEADS_URL, params={"q": term})).json()["items"]

        expected = [] if term == "\\" else ["Discount 100% Off_Now"]
        assert [item["name"] for item in items] == expected

    @pytest.mark.parametrize(
        ("params", "field"),
        [
            ({"limit": 0}, "limit"),
            ({"limit": 101}, "limit"),
            ({"q": "x" * 101}, "q"),
            ({"status": "archived"}, "status"),
        ],
    )
    async def test_invalid_query_params_are_422(
        self, client: httpx.AsyncClient, params: dict[str, object], field: str
    ) -> None:
        response = await client.get(LEADS_URL, params=params)

        assert_problem(response, 422, "validation-error")
        assert field in field_errors(response)

    async def test_malformed_cursor_is_400(self, client: httpx.AsyncClient) -> None:
        response = await client.get(LEADS_URL, params={"cursor": "garbage"})

        assert_problem(response, 400, "invalid-cursor")

    async def test_invalid_timezone_is_400(self, client: httpx.AsyncClient) -> None:
        response = await client.get(LEADS_URL, headers={"X-Timezone": "Mars/Olympus_Mons"})

        assert_problem(response, 400, "invalid-timezone")

    async def test_missing_timezone_falls_back_to_default(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)
        await log_note(client, lead["id"], follow_up_at=FROZEN_NOW + timedelta(hours=13))
        del client.headers["X-Timezone"]

        listed = (await client.get(LEADS_URL)).json()["items"][0]

        assert listed["follow_up_state"] == "upcoming"

    async def test_follow_up_state_uses_the_viewers_time_zone(
        self, client: httpx.AsyncClient
    ) -> None:
        lead = await create_lead(client)
        await log_note(client, lead["id"], follow_up_at=FROZEN_NOW + timedelta(hours=13))

        in_kolkata = await client.get(lead_url(lead["id"]))
        in_new_york = await client.get(
            lead_url(lead["id"]), headers={"X-Timezone": "America/New_York"}
        )

        assert in_kolkata.json()["follow_up_state"] == "upcoming"
        assert in_new_york.json()["follow_up_state"] == "today"

    async def test_reports_idle_and_stale_leads(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        clock.advance(timedelta(days=3))

        listed = (await client.get(lead_url(lead["id"]))).json()

        assert listed["idle_days"] == 3
        assert listed["is_stale"] is True


class TestFollowUps:
    async def test_splits_overdue_and_today_in_due_order(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        overdue_late = await create_lead(client, name="Overdue 1d")
        overdue_early = await create_lead(client, name="Overdue 3d")
        today_later = await create_lead(client, name="Today later")
        today_passed = await create_lead(client, name="Today passed")
        upcoming = await create_lead(client, name="Tomorrow")
        clock.set(FROZEN_NOW - timedelta(days=4))
        await log_note(client, overdue_late["id"], follow_up_at=FROZEN_NOW - timedelta(days=1))
        await log_note(client, overdue_early["id"], follow_up_at=FROZEN_NOW - timedelta(days=3))
        await log_note(client, today_passed["id"], follow_up_at=FROZEN_NOW - timedelta(hours=2))
        clock.set(FROZEN_NOW)
        await log_note(client, today_later["id"], follow_up_at=FROZEN_NOW + timedelta(hours=3))
        await log_note(client, upcoming["id"], follow_up_at=FROZEN_NOW + timedelta(days=1))

        body = (await client.get(f"{LEADS_URL}/follow-ups")).json()

        assert [lead["name"] for lead in body["overdue"]] == ["Overdue 3d", "Overdue 1d"]
        assert [lead["name"] for lead in body["today"]] == ["Today passed", "Today later"]
        assert {lead["follow_up_state"] for lead in body["overdue"]} == {"overdue"}

    async def test_respects_status_filter_and_search(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        contacted = await create_lead(client, name="Arjun Kapoor")
        fresh = await create_lead(client, name="Neha Gupta")
        for lead in (contacted, fresh):
            await log_note(client, lead["id"], follow_up_at=FROZEN_NOW + timedelta(hours=1))
        clock.advance(timedelta(minutes=1))
        await change_status(client, contacted["id"], "contacted")

        by_status = (
            await client.get(f"{LEADS_URL}/follow-ups", params={"status": "contacted"})
        ).json()
        by_search = (await client.get(f"{LEADS_URL}/follow-ups", params={"q": "neha"})).json()

        assert [lead["name"] for lead in by_status["today"]] == ["Arjun Kapoor"]
        assert [lead["name"] for lead in by_search["today"]] == ["Neha Gupta"]


class TestStats:
    async def test_counts_by_status_and_follow_up_bucket(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        overdue = await create_lead(client, name="Overdue")
        due_today = await create_lead(client, name="Due today")
        won = await create_lead(client, name="Won deal")
        clock.set(FROZEN_NOW - timedelta(days=2))
        await log_note(client, overdue["id"], follow_up_at=FROZEN_NOW - timedelta(days=1))
        clock.set(FROZEN_NOW)
        await log_note(client, due_today["id"], follow_up_at=FROZEN_NOW + timedelta(hours=1))
        await change_status(client, won["id"], "won")

        stats = (await client.get(f"{LEADS_URL}/stats")).json()

        assert stats == {
            "total": 3,
            "by_status": {
                "new": 2,
                "contacted": 0,
                "qualified": 0,
                "proposal_sent": 0,
                "won": 1,
                "lost": 0,
            },
            "overdue": 1,
            "due_today": 1,
        }

    async def test_counts_respect_search(self, client: httpx.AsyncClient) -> None:
        await create_lead(client, name="Meera Nair", company="Lotus Financial Planning")
        await create_lead(client, name="Rohan Mehta")

        stats = (await client.get(f"{LEADS_URL}/stats", params={"q": "lotus"})).json()

        assert stats["total"] == 1
        assert stats["by_status"]["new"] == 1


class TestCompleteFollowUp:
    async def test_clears_follow_up_and_logs_completion(
        self, client: httpx.AsyncClient, clock: FixedClock
    ) -> None:
        lead = await create_lead(client)
        due = FROZEN_NOW + timedelta(hours=2)
        await log_note(client, lead["id"], follow_up_at=due)
        clock.advance(timedelta(minutes=30))

        response = await client.post(f"{lead_url(lead['id'])}/follow-up/complete")

        assert response.status_code == 200
        completed = response.json()
        assert completed["next_follow_up_at"] is None
        assert completed["follow_up_state"] == "none"
        assert parse_time(completed["last_activity_at"]) == clock.now()
        event = (await timeline(client, lead["id"]))[0]
        assert event["kind"] == "follow_up_completed"
        assert parse_time(event["meta"]["due_at"]) == due

    async def test_without_pending_follow_up_is_409(self, client: httpx.AsyncClient) -> None:
        lead = await create_lead(client)

        response = await client.post(f"{lead_url(lead['id'])}/follow-up/complete")

        assert_problem(response, 409, "no-pending-follow-up")

    async def test_unknown_lead_is_404(self, client: httpx.AsyncClient) -> None:
        response = await client.post(
            f"{lead_url('00000000-0000-4000-8000-000000000000')}/follow-up/complete"
        )

        assert_problem(response, 404, "lead-not-found")
