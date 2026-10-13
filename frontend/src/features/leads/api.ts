import { LIMITS } from "@/config/limits";
import { api, unwrap } from "@/lib/api/client";
import type {
  FollowUps,
  Lead,
  LeadCreateInput,
  LeadPage,
  LeadStats,
  LeadUpdateInput,
} from "@/lib/api/types";
import type { LeadListFilters } from "@/lib/query-keys";

function filterQuery(filters: LeadListFilters) {
  return {
    status: filters.status ?? undefined,
    q: filters.q || undefined,
  };
}

export function fetchLeads(
  filters: LeadListFilters,
  cursor: string | null,
  signal?: AbortSignal,
  limit: number = LIMITS.leadsPageSize,
): Promise<LeadPage> {
  return unwrap(
    api.GET("/api/v1/leads", {
      params: { query: { ...filterQuery(filters), limit, cursor: cursor ?? undefined } },
      signal,
    }),
  );
}

export function fetchFollowUps(filters: LeadListFilters, signal?: AbortSignal): Promise<FollowUps> {
  return unwrap(
    api.GET("/api/v1/leads/follow-ups", { params: { query: filterQuery(filters) }, signal }),
  );
}

export function fetchLeadStats(q: string, signal?: AbortSignal): Promise<LeadStats> {
  return unwrap(
    api.GET("/api/v1/leads/stats", { params: { query: { q: q || undefined } }, signal }),
  );
}

export function fetchLead(leadId: string, signal?: AbortSignal): Promise<Lead> {
  return unwrap(
    api.GET("/api/v1/leads/{lead_id}", { params: { path: { lead_id: leadId } }, signal }),
  );
}

export function createLead(input: LeadCreateInput): Promise<Lead> {
  return unwrap(api.POST("/api/v1/leads", { body: input }));
}

export function updateLead(leadId: string, input: LeadUpdateInput): Promise<Lead> {
  return unwrap(
    api.PATCH("/api/v1/leads/{lead_id}", { params: { path: { lead_id: leadId } }, body: input }),
  );
}

export function completeFollowUp(leadId: string): Promise<Lead> {
  return unwrap(
    api.POST("/api/v1/leads/{lead_id}/follow-up/complete", {
      params: { path: { lead_id: leadId } },
    }),
  );
}
