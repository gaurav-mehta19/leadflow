"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createLead } from "@/features/leads/api";
import { invalidateLeadQueries } from "@/features/leads/cache";
import type { Lead, LeadCreateInput } from "@/lib/api/types";
import { leadKeys } from "@/lib/query-keys";

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadCreateInput) => createLead(input),
    onSuccess: async (lead: Lead) => {
      queryClient.setQueryData(leadKeys.detail(lead.id), lead);
      await invalidateLeadQueries(queryClient);
    },
  });
}
