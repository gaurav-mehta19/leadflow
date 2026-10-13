import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  isPinned,
  type LeadPages,
  matchesFilters,
  notePreview,
  patchLeadEverywhere,
} from "@/features/leads/cache";
import type { FollowUps, Lead, LeadStats } from "@/lib/api/types";
import { type LeadListFilters, leadKeys } from "@/lib/query-keys";

const ALL: LeadListFilters = { status: null, q: "" };

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    name: "Ananya Iyer",
    company: "Meridian Wealth Partners",
    phone: null,
    status: "contacted",
    next_follow_up_at: null,
    follow_up_state: "none",
    is_stale: false,
    idle_days: 0,
    last_note: null,
    last_activity_at: "2026-05-01T10:00:00Z",
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

function stats(overrides: Partial<LeadStats> = {}): LeadStats {
  return {
    total: 2,
    by_status: { new: 1, contacted: 1, qualified: 0, proposal_sent: 0, won: 0, lost: 0 },
    overdue: 0,
    due_today: 0,
    ...overrides,
  };
}

function seed(leads: Lead[], followUps: FollowUps = { overdue: [], today: [] }): QueryClient {
  const client = new QueryClient();
  client.setQueryData<LeadPages>(leadKeys.list(ALL), {
    pages: [{ items: leads, next_cursor: null }],
    pageParams: [null],
  });
  client.setQueryData<FollowUps>(leadKeys.followUps(ALL), followUps);
  client.setQueryData<LeadStats>(leadKeys.stats(""), stats());
  return client;
}

describe("isPinned", () => {
  it("pins open leads that are overdue or due today", () => {
    expect(isPinned(lead({ follow_up_state: "overdue" }))).toBe(true);
    expect(isPinned(lead({ follow_up_state: "today" }))).toBe(true);
    expect(isPinned(lead({ follow_up_state: "upcoming" }))).toBe(false);
    expect(isPinned(lead({ follow_up_state: "today", status: "won" }))).toBe(false);
  });
});

describe("notePreview", () => {
  it("collapses whitespace and truncates to 160 characters", () => {
    expect(notePreview("Shared  pricing.\n\nCall back")).toBe("Shared pricing. Call back");
    expect(notePreview("x".repeat(200))).toHaveLength(160);
  });
});

describe("matchesFilters", () => {
  it("matches status and case-insensitive name or company", () => {
    expect(matchesFilters(lead(), ALL)).toBe(true);
    expect(matchesFilters(lead(), { status: "qualified", q: "" })).toBe(false);
    expect(matchesFilters(lead(), { status: null, q: "MERIDIAN" })).toBe(true);
    expect(matchesFilters(lead(), { status: null, q: "kestrel" })).toBe(false);
  });
});

describe("patchLeadEverywhere", () => {
  it("pins a lead whose follow-up becomes due today and counts it", () => {
    const client = seed([lead(), lead({ id: "lead-2", name: "Rohan Mehta", status: "new" })]);

    patchLeadEverywhere(client, "lead-1", (current) => ({
      ...current,
      next_follow_up_at: "2026-05-04T12:00:00Z",
      follow_up_state: "today",
    }));

    expect(client.getQueryData<FollowUps>(leadKeys.followUps(ALL))?.today.map((l) => l.id)).toEqual(
      ["lead-1"],
    );
    expect(client.getQueryData<LeadStats>(leadKeys.stats(""))?.due_today).toBe(1);
  });

  it("unpins a lead when its follow-up is completed and moves it to the top", () => {
    const pinned = lead({
      id: "lead-2",
      follow_up_state: "overdue",
      next_follow_up_at: "2026-05-01T09:00:00Z",
    });
    const client = seed([lead(), pinned], { overdue: [pinned], today: [] });
    client.setQueryData<LeadStats>(leadKeys.stats(""), stats({ overdue: 1 }));

    patchLeadEverywhere(
      client,
      "lead-2",
      (current) => ({ ...current, next_follow_up_at: null, follow_up_state: "none" }),
      { moveToTop: true },
    );

    expect(client.getQueryData<FollowUps>(leadKeys.followUps(ALL))?.overdue).toEqual([]);
    expect(
      client.getQueryData<LeadPages>(leadKeys.list(ALL))?.pages[0]?.items.map((l) => l.id),
    ).toEqual(["lead-2", "lead-1"]);
    expect(client.getQueryData<LeadStats>(leadKeys.stats(""))?.overdue).toBe(0);
  });

  it("moves status counts when the status changes", () => {
    const client = seed([lead()]);

    patchLeadEverywhere(client, "lead-1", (current) => ({ ...current, status: "won" }));

    const byStatus = client.getQueryData<LeadStats>(leadKeys.stats(""))?.by_status;
    expect(byStatus?.contacted).toBe(0);
    expect(byStatus?.won).toBe(1);
    expect(client.getQueryData<Lead>(leadKeys.detail("lead-1"))?.status).toBe("won");
  });

  it("does nothing for leads that are not cached", () => {
    const client = seed([lead()]);

    expect(patchLeadEverywhere(client, "missing", (current) => current)).toBeUndefined();
  });
});
