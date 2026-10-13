"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { COPY } from "@/config/copy";
import { LeadSheetHeader } from "@/features/lead-detail/components/lead-sheet-header";
import { Timeline } from "@/features/lead-detail/components/timeline";
import { useLead } from "@/features/lead-detail/hooks/use-lead";
import { useLeadParam } from "@/features/leads/hooks/use-lead-param";
import { useNow } from "@/hooks/use-now";
import { isApiError } from "@/lib/api/problem";

function HiddenSheetLabels() {
  return (
    <>
      <SheetTitle className="sr-only">{COPY.detail.sheetTitle}</SheetTitle>
      <SheetDescription className="sr-only">{COPY.detail.sheetDescription}</SheetDescription>
    </>
  );
}

function SheetLoading() {
  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6" aria-busy>
      <HiddenSheetLabels />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

function LeadSheetBody({ leadId }: { leadId: string }) {
  const now = useNow();
  const { closeLead } = useLeadParam();
  const leadQuery = useLead(leadId);
  const lead = leadQuery.data;
  const missing = isApiError(leadQuery.error) && leadQuery.error.status === 404;

  useEffect(() => {
    if (missing) {
      toast.error(COPY.toasts.leadMissing);
      void closeLead();
    }
  }, [missing, closeLead]);

  if (!lead) {
    return leadQuery.error && !missing ? (
      <div className="p-5 sm:p-6">
        <HiddenSheetLabels />
        <ErrorState error={leadQuery.error} onRetry={() => void leadQuery.refetch()} />
      </div>
    ) : (
      <SheetLoading />
    );
  }

  return (
    <>
      <header className="border-b px-5 pt-5 pb-4 sm:px-6">
        <LeadSheetHeader lead={lead} />
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
          <Timeline leadId={lead.id} now={now} />
        </div>
      </div>
    </>
  );
}

export function LeadSheet() {
  const { leadId, closeLead } = useLeadParam();
  const [shownLeadId, setShownLeadId] = useState(leadId);
  if (leadId !== null && leadId !== shownLeadId) {
    setShownLeadId(leadId);
  }

  return (
    <Sheet
      open={leadId !== null}
      onOpenChange={(open) => {
        if (!open) {
          void closeLead();
        }
      }}
    >
      {shownLeadId ? (
        <SheetContent>
          <LeadSheetBody key={shownLeadId} leadId={shownLeadId} />
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
