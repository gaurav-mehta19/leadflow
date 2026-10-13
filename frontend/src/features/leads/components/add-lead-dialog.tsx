"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COPY } from "@/config/copy";
import { LeadForm } from "@/features/leads/components/lead-form";
import { useCreateLead } from "@/features/leads/hooks/use-create-lead";
import { toLeadPayload } from "@/features/leads/schemas";
import type { Lead } from "@/lib/api/types";

type AddLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (lead: Lead) => void;
  onOpenExisting: (leadId: string) => void;
};

export function AddLeadDialog({
  open,
  onOpenChange,
  onCreated,
  onOpenExisting,
}: AddLeadDialogProps) {
  const createLead = useCreateLead();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COPY.addLead.title}</DialogTitle>
          <DialogDescription>{COPY.addLead.description}</DialogDescription>
        </DialogHeader>
        <LeadForm
          submitLabel={COPY.actions.createLead}
          pending={createLead.isPending}
          onCancel={() => onOpenChange(false)}
          onOpenExisting={(leadId) => {
            onOpenChange(false);
            onOpenExisting(leadId);
          }}
          onSubmit={async (values) => {
            const lead = await createLead.mutateAsync(toLeadPayload(values));
            onOpenChange(false);
            onCreated(lead);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
