import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import { isClosedStatus } from "@/config/statuses";
import type { Activity, ActivityPage, FollowUps, Lead, LeadPage, LeadStats } from "@/lib/api/types";
import { followUpStateAt } from "@/lib/dates";
import { activityKeys, type LeadListFilters, leadKeys } from "@/lib/query-keys";

export type LeadPages = InfiniteData<LeadPage, string | null>;
export type ActivityPages = InfiniteData<ActivityPage, string | null>;
export type CacheSnapshot = ReadonlyArray<readonly [QueryKey, unknown]>;
export type LeadUpdater = (lead: Lead) => Lead;

const PREVIEW_LENGTH = 160;
const OPTIMISTIC_ID_PREFIX = "optimistic-";

export function optimisticId(): string {
  return `${OPTIMISTIC_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isOptimistic(activity: Activity): boolean {
  return activity.id.startsWith(OPTIMISTIC_ID_PREFIX);
}

export function notePreview(body: string): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  return collapsed.length <= PREVIEW_LENGTH
    ? collapsed
    : `${collapsed.slice(0, PREVIEW_LENGTH - 1)}…`;
}

export function isPinned(lead: Lead): boolean {
  return (
    !isClosedStatus(lead.status) &&
    (lead.follow_up_state === "overdue" || lead.follow_up_state === "today")
  );
}

function byDueDate(left: Lead, right: Lead): number {
  return (left.next_follow_up_at ?? "").localeCompare(right.next_follow_up_at ?? "");
}

export function findCachedLead(queryClient: QueryClient, leadId: string): Lead | undefined {
  const detail = queryClient.getQueryData<Lead>(leadKeys.detail(leadId));
  if (detail) {
    return detail;
  }
  for (const [, data] of queryClient.getQueriesData<LeadPages>({ queryKey: leadKeys.lists() })) {
    const match = data?.pages.flatMap((page) => page.items).find((lead) => lead.id === leadId);
    if (match) {
      return match;
    }
  }
  for (const [, data] of queryClient.getQueriesData<FollowUps>({
    queryKey: leadKeys.followUpsAll(),
  })) {
    const match = [...(data?.overdue ?? []), ...(data?.today ?? [])].find(
      (lead) => lead.id === leadId,
    );
    if (match) {
      return match;
    }
  }
  return undefined;
}

function updateLists(queryClient: QueryClient, updated: Lead, moveToTop: boolean): void {
  queryClient.setQueriesData<LeadPages>({ queryKey: leadKeys.lists() }, (data) => {
    if (!data || !data.pages.some((page) => page.items.some((lead) => lead.id === updated.id))) {
      return data;
    }
    const pages = data.pages.map((page) => ({
      ...page,
      items: moveToTop
        ? page.items.filter((lead) => lead.id !== updated.id)
        : page.items.map((lead) => (lead.id === updated.id ? updated : lead)),
    }));
    const [first, ...rest] = pages;
    if (moveToTop && first) {
      return { ...data, pages: [{ ...first, items: [updated, ...first.items] }, ...rest] };
    }
    return { ...data, pages };
  });
}

function isLeadListFilters(value: unknown): value is LeadListFilters {
  return typeof value === "object" && value !== null && "status" in value && "q" in value;
}

export function matchesFilters(lead: Lead, filters: LeadListFilters): boolean {
  if (filters.status !== null && lead.status !== filters.status) {
    return false;
  }
  const term = filters.q.trim().toLowerCase();
  return (
    term === "" ||
    lead.name.toLowerCase().includes(term) ||
    (lead.company ?? "").toLowerCase().includes(term)
  );
}

function updateFollowUps(queryClient: QueryClient, updated: Lead): void {
  for (const [queryKey, data] of queryClient.getQueriesData<FollowUps>({
    queryKey: leadKeys.followUpsAll(),
  })) {
    if (!data) {
      continue;
    }
    const filters = queryKey[2];
    const without = (leads: Lead[]) => leads.filter((lead) => lead.id !== updated.id);
    const wasListed = [...data.overdue, ...data.today].some((lead) => lead.id === updated.id);
    const belongs =
      isPinned(updated) &&
      (wasListed || (isLeadListFilters(filters) && matchesFilters(updated, filters)));
    const bucket = updated.follow_up_state === "overdue" ? "overdue" : "today";
    queryClient.setQueryData<FollowUps>(queryKey, {
      overdue:
        belongs && bucket === "overdue"
          ? [...without(data.overdue), updated].sort(byDueDate)
          : without(data.overdue),
      today:
        belongs && bucket === "today"
          ? [...without(data.today), updated].sort(byDueDate)
          : without(data.today),
    });
  }
}

function bucketOf(lead: Lead): "overdue" | "due_today" | null {
  if (!isPinned(lead)) {
    return null;
  }
  return lead.follow_up_state === "overdue" ? "overdue" : "due_today";
}

function updateStats(queryClient: QueryClient, before: Lead, after: Lead): void {
  queryClient.setQueriesData<LeadStats>({ queryKey: leadKeys.statsAll() }, (stats) => {
    if (!stats) {
      return stats;
    }
    const next = { ...stats, by_status: { ...stats.by_status } };
    if (before.status !== after.status) {
      next.by_status[before.status] = Math.max(0, next.by_status[before.status] - 1);
      next.by_status[after.status] += 1;
    }
    const beforeBucket = bucketOf(before);
    const afterBucket = bucketOf(after);
    if (beforeBucket !== afterBucket) {
      if (beforeBucket) {
        next[beforeBucket] = Math.max(0, next[beforeBucket] - 1);
      }
      if (afterBucket) {
        next[afterBucket] += 1;
      }
    }
    return next;
  });
}

export function patchLeadEverywhere(
  queryClient: QueryClient,
  leadId: string,
  update: LeadUpdater,
  options: { moveToTop?: boolean } = {},
): Lead | undefined {
  const current = findCachedLead(queryClient, leadId);
  if (!current) {
    return undefined;
  }
  const updated = update(current);
  queryClient.setQueryData<Lead>(leadKeys.detail(leadId), updated);
  updateLists(queryClient, updated, options.moveToTop ?? false);
  updateFollowUps(queryClient, updated);
  updateStats(queryClient, current, updated);
  queryClient.setQueriesData<LeadPage>({ queryKey: leadKeys.searches() }, (data) =>
    data
      ? { ...data, items: data.items.map((lead) => (lead.id === leadId ? updated : lead)) }
      : data,
  );
  return updated;
}

export function replaceLeadEverywhere(queryClient: QueryClient, lead: Lead): void {
  patchLeadEverywhere(queryClient, lead.id, () => lead);
}

export function prependActivity(
  queryClient: QueryClient,
  leadId: string,
  activity: Activity,
): void {
  queryClient.setQueryData<ActivityPages>(activityKeys.list(leadId), (data) => {
    const [first, ...rest] = data?.pages ?? [];
    if (!data || !first) {
      return data;
    }
    return { ...data, pages: [{ ...first, items: [activity, ...first.items] }, ...rest] };
  });
}

export async function cancelLeadQueries(queryClient: QueryClient, leadId: string): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: leadKeys.all }),
    queryClient.cancelQueries({ queryKey: activityKeys.list(leadId) }),
  ]);
}

export function snapshotLeadQueries(queryClient: QueryClient, leadId: string): CacheSnapshot {
  return [
    ...queryClient.getQueriesData({ queryKey: leadKeys.all }),
    ...queryClient.getQueriesData({ queryKey: activityKeys.list(leadId) }),
  ];
}

export function restoreSnapshot(
  queryClient: QueryClient,
  snapshot: CacheSnapshot | undefined,
): void {
  for (const [queryKey, data] of snapshot ?? []) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function invalidateLeadQueries(queryClient: QueryClient, leadId?: string): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: leadKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: leadKeys.followUpsAll() }),
    queryClient.invalidateQueries({ queryKey: leadKeys.statsAll() }),
    queryClient.invalidateQueries({ queryKey: leadKeys.searches() }),
  ];
  if (leadId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) }),
      queryClient.invalidateQueries({ queryKey: activityKeys.list(leadId) }),
    );
  }
  return Promise.all(invalidations).then(() => undefined);
}

export function touchLead(lead: Lead, now: Date): Lead {
  const timestamp = now.toISOString();
  return {
    ...lead,
    last_activity_at: timestamp,
    updated_at: timestamp,
    idle_days: 0,
    is_stale: false,
  };
}

export function withFollowUp(lead: Lead, dueAt: string | null, now: Date): Lead {
  return { ...lead, next_follow_up_at: dueAt, follow_up_state: followUpStateAt(dueAt, now) };
}
