"use client";

import { Copy, Phone, XIcon } from "lucide-react";
import { toast } from "sonner";

import { LeadAvatar } from "@/components/common/lead-avatar";
import { Button } from "@/components/ui/button";
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COPY } from "@/config/copy";
import type { Lead } from "@/lib/api/types";

type LeadSheetHeaderProps = {
  lead: Lead;
};

async function copyPhone(phone: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(phone);
    toast.success(COPY.toasts.phoneCopied);
  } catch {
    toast.error(COPY.toasts.copyFailed);
  }
}

export function LeadSheetHeader({ lead }: LeadSheetHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <LeadAvatar name={lead.name} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
          <SheetTitle className="truncate">{lead.name}</SheetTitle>
          <SheetDescription className={lead.company ? "text-foreground/80" : undefined}>
            {lead.company ?? COPY.lead.noCompany}
          </SheetDescription>
          {lead.phone ? (
            <div className="mt-1 flex items-center gap-1">
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 rounded-sm font-mono text-meta whitespace-nowrap text-primary underline-offset-4 hover:underline"
              >
                <Phone aria-hidden className="size-3.5" />
                {lead.phone}
              </a>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    aria-label={COPY.actions.copyPhone}
                    onClick={() => void copyPhone(lead.phone ?? "")}
                  >
                    <Copy aria-hidden className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{COPY.actions.copyPhone}</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label={COPY.actions.close}>
              <XIcon aria-hidden />
            </Button>
          </SheetClose>
        </div>
      </div>
    </div>
  );
}
