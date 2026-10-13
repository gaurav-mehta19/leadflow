import { LIMITS } from "@/config/limits";
import { api, unwrap } from "@/lib/api/client";
import type { ActivityPage, NoteCreated, NoteCreateInput } from "@/lib/api/types";

export function fetchActivities(
  leadId: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<ActivityPage> {
  return unwrap(
    api.GET("/api/v1/leads/{lead_id}/activities", {
      params: {
        path: { lead_id: leadId },
        query: { limit: LIMITS.activitiesPageSize, cursor: cursor ?? undefined },
      },
      signal,
    }),
  );
}

export function logNote(leadId: string, input: NoteCreateInput): Promise<NoteCreated> {
  return unwrap(
    api.POST("/api/v1/leads/{lead_id}/activities", {
      params: { path: { lead_id: leadId } },
      body: input,
    }),
  );
}
