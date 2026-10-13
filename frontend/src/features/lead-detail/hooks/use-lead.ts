"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchLead } from "@/features/leads/api";
import { findCachedLead } from "@/features/leads/cache";
import type { Lead } from "@/lib/api/types";
import { leadKeys } from "@/lib/query-keys";

export function useLead(leadId: string) {
  const queryClient = useQueryClient();
  return useQuery<Lead>({
    queryKey: leadKeys.detail(leadId),
    queryFn: ({ signal }) => fetchLead(leadId, signal),
    placeholderData: () => findCachedLead(queryClient, leadId),
  });
}
