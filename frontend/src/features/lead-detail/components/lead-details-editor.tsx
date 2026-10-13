"use client";

import { COPY } from "@/config/copy";
import { LeadForm } from "@/features/leads/components/lead-form";
import { useUpdateLead } from "@/features/leads/hooks/use-update-lead";
import { toLeadPayload } from "@/features/leads/schemas";
import type { Lead } from "@/lib/api/types";

type LeadDetailsEditorProps = {
  lead: Lead;
  onDone: () => void;
  onOpenExisting: (leadId: string) => void;
};

export function LeadDetailsEditor({ lead, onDone, onOpenExisting }: LeadDetailsEditorProps) {
  const updateLead = useUpdateLead();
  return (
    <LeadForm
      autoFocus
      className="rounded-xl border bg-surface-muted p-4"
      defaultValues={{ name: lead.name, company: lead.company ?? "", phone: lead.phone ?? "" }}
      submitLabel={COPY.actions.save}
      pending={updateLead.isPending}
      onCancel={onDone}
      onOpenExisting={onOpenExisting}
      onSubmit={async (values) => {
        await updateLead.mutateAsync({ leadId: lead.id, input: toLeadPayload(values) });
        onDone();
      }}
    />
  );
}
