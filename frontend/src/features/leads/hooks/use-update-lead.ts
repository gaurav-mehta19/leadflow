"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { COPY } from "@/config/copy";
import { updateLead } from "@/features/leads/api";
import { invalidateLeadQueries, replaceLeadEverywhere } from "@/features/leads/cache";
import type { LeadUpdateInput } from "@/lib/api/types";

type DetailsUpdate = {
  leadId: string;
  input: LeadUpdateInput;
};

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, input }: DetailsUpdate) => updateLead(leadId, input),
    onSuccess: (lead) => {
      replaceLeadEverywhere(queryClient, lead);
      toast.success(COPY.toasts.detailsSaved);
    },
    onSettled: (_data, _error, { leadId }) => invalidateLeadQueries(queryClient, leadId),
  });
}
