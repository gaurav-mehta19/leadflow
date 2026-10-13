import type { LeadStatus } from "@/lib/api/types";

export type LeadListFilters = {
  status: LeadStatus | null;
  q: string;
};

export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (filters: LeadListFilters) => [...leadKeys.lists(), filters] as const,
  followUpsAll: () => [...leadKeys.all, "follow-ups"] as const,
  followUps: (filters: LeadListFilters) => [...leadKeys.followUpsAll(), filters] as const,
  statsAll: () => [...leadKeys.all, "stats"] as const,
  stats: (q: string) => [...leadKeys.statsAll(), q] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (leadId: string) => [...leadKeys.details(), leadId] as const,
  searches: () => [...leadKeys.all, "search"] as const,
  search: (q: string) => [...leadKeys.searches(), q] as const,
};

export const activityKeys = {
  all: ["activities"] as const,
  list: (leadId: string) => [...activityKeys.all, leadId] as const,
};
