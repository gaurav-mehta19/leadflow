"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COPY } from "@/config/copy";
import { LEAD_STATUSES, STATUS_CONFIG, isLeadStatus } from "@/config/statuses";
import type { LeadStats, LeadStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";

const ALL = "all";

type LeadFiltersProps = {
  status: LeadStatus | null;
  stats: LeadStats | undefined;
  onStatusChange: (status: LeadStatus | null) => void;
};

function Count({ value }: { value: number | undefined }) {
  return (
    <span className="font-mono text-xs tabular opacity-70" aria-hidden={value === undefined}>
      {value ?? "–"}
    </span>
  );
}

export function LeadFilters({ status, stats, onStatusChange }: LeadFiltersProps) {
  return (
    <div className="-mx-4 -my-1.5 scrollbar-none overflow-x-auto edge-fade-x px-4 sm:mx-0 sm:[mask-image:none] sm:px-0">
      <ToggleGroup
        type="single"
        value={status ?? ALL}
        onValueChange={(value) => {
          if (value) {
            onStatusChange(isLeadStatus(value) ? value : null);
          }
        }}
        aria-label={COPY.sections.statusFilter}
        className="w-max px-0.5 py-1.5"
      >
        <ToggleGroupItem value={ALL}>
          {COPY.sections.allStatuses}
          <Count value={stats?.total} />
        </ToggleGroupItem>
        {LEAD_STATUSES.map((value) => {
          const config = STATUS_CONFIG[value];
          return (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem value={value}>
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      config.tone.dot,
                      status === value && "bg-primary-foreground",
                    )}
                  />
                  {config.label}
                  <Count value={stats?.by_status[value]} />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>{config.description}</TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
