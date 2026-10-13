"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { COPY } from "@/config/copy";
import { logNote } from "@/features/lead-detail/api";
import {
  cancelLeadQueries,
  invalidateLeadQueries,
  notePreview,
  optimisticId,
  patchLeadEverywhere,
  prependActivity,
  replaceLeadEverywhere,
  restoreSnapshot,
  snapshotLeadQueries,
  touchLead,
  withFollowUp,
} from "@/features/leads/cache";
import { refreshNow } from "@/hooks/use-now";
import { describeWhen, toOffsetIso } from "@/lib/dates";

type NoteInput = {
  leadId: string;
  body: string;
  followUpAt: Date | null;
};

export function useLogNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, body, followUpAt }: NoteInput) =>
      logNote(leadId, { body, follow_up_at: followUpAt ? toOffsetIso(followUpAt) : null }),
    onMutate: async ({ leadId, body, followUpAt }) => {
      await cancelLeadQueries(queryClient, leadId);
      const snapshot = snapshotLeadQueries(queryClient, leadId);
      refreshNow();
      const now = new Date();
      const occurredAt = now.toISOString();
      const followUpIso = followUpAt ? followUpAt.toISOString() : null;
      prependActivity(queryClient, leadId, {
        id: optimisticId(),
        lead_id: leadId,
        kind: "note",
        body: body.trim(),
        follow_up_at: followUpIso,
        meta: null,
        occurred_at: occurredAt,
      });
      patchLeadEverywhere(
        queryClient,
        leadId,
        (lead) => {
          const touched = {
            ...touchLead(lead, now),
            last_note: { preview: notePreview(body), occurred_at: occurredAt },
          };
          return followUpIso ? withFollowUp(touched, followUpIso, now) : touched;
        },
        { moveToTop: true },
      );
      return { snapshot };
    },
    onSuccess: ({ activity, lead }) => {
      replaceLeadEverywhere(queryClient, lead);
      toast.success(
        activity.follow_up_at
          ? COPY.toasts.noteLoggedWithFollowUp(describeWhen(activity.follow_up_at, new Date()))
          : COPY.toasts.noteLogged,
      );
    },
    onError: (_error, _input, context) => restoreSnapshot(queryClient, context?.snapshot),
    onSettled: (_data, _error, { leadId }) => invalidateLeadQueries(queryClient, leadId),
  });
}
