"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { COPY } from "@/config/copy";
import { completeFollowUp } from "@/features/leads/api";
import {
  cancelLeadQueries,
  invalidateLeadQueries,
  patchLeadEverywhere,
  replaceLeadEverywhere,
  restoreSnapshot,
  snapshotLeadQueries,
  touchLead,
} from "@/features/leads/cache";
import { refreshNow } from "@/hooks/use-now";

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => completeFollowUp(leadId),
    onMutate: async (leadId) => {
      await cancelLeadQueries(queryClient, leadId);
      const snapshot = snapshotLeadQueries(queryClient, leadId);
      refreshNow();
      patchLeadEverywhere(queryClient, leadId, (lead) => ({
        ...touchLead(lead, new Date()),
        next_follow_up_at: null,
        follow_up_state: "none",
      }));
      return { snapshot };
    },
    onSuccess: (lead) => {
      replaceLeadEverywhere(queryClient, lead);
      toast.success(COPY.toasts.followUpDone);
    },
    onError: (_error, _leadId, context) => restoreSnapshot(queryClient, context?.snapshot),
    onSettled: (_data, _error, leadId) => invalidateLeadQueries(queryClient, leadId),
  });
}
