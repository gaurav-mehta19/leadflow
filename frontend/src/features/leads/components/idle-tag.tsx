import { Hourglass } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COPY } from "@/config/copy";

export function IdleTag({ days }: { days: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 font-mono text-xs font-medium whitespace-nowrap text-warning tabular">
          <Hourglass aria-hidden className="size-3.5" />
          {COPY.lead.idleTag(days)}
          <span className="sr-only">. {COPY.lead.idleTooltip(days)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{COPY.lead.idleTooltip(days)}</TooltipContent>
    </Tooltip>
  );
}
