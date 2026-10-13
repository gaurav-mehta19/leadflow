"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

import { COPY } from "@/config/copy";
import { TIMING } from "@/config/limits";
import { isClosedStatus, statusLabel } from "@/config/statuses";
import { updateLead } from "@/features/leads/api";
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
import type { Lead, LeadStatus } from "@/lib/api/types";

type StatusChange = {
  leadId: string;
  status: LeadStatus;
  restore?: Lead;
};

export function predictStatusChange(lead: Lead, status: LeadStatus, now: Date): Lead {
  const touched = { ...touchLead(lead, now), status };
  return isClosedStatus(status)
    ? { ...touched, next_follow_up_at: null, follow_up_state: "none" }
    : touched;
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: ({ leadId, status }: StatusChange) => updateLead(leadId, { status }),
    onMutate: async ({ leadId, status, restore }) => {
      await cancelLeadQueries(queryClient, leadId);
      const snapshot = snapshotLeadQueries(queryClient, leadId);
      refreshNow();
      patchLeadEverywhere(
        queryClient,
        leadId,
        (lead) => restore ?? predictStatusChange(lead, status, new Date()),
        { moveToTop: restore === undefined },
      );
      return { snapshot };
    },
    onSuccess: (lead) => replaceLeadEverywhere(queryClient, lead),
    onError: (_error, _change, context) => restoreSnapshot(queryClient, context?.snapshot),
    onSettled: (_data, _error, { leadId }) => invalidateLeadQueries(queryClient, leadId),
  });

  const changeStatus = useCallback(
    (lead: Lead, status: LeadStatus) => {
      if (lead.status === status) {
        return;
      }
      mutate(
        { leadId: lead.id, status },
        {
          onSuccess: () => {
            toast.success(COPY.toasts.movedTo(statusLabel(status)), {
              duration: TIMING.undoToastMs,
              action: {
                label: COPY.actions.undo,
                onClick: () => mutate({ leadId: lead.id, status: lead.status, restore: lead }),
              },
            });
          },
        },
      );
    },
    [mutate],
  );

  return { changeStatus, isPending };
}
