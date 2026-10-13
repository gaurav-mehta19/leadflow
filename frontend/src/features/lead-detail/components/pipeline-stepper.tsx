"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { useId } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COPY } from "@/config/copy";
import {
  CLOSED_STATUSES,
  isLeadStatus,
  LEAD_STATUSES,
  OPEN_STATUSES,
  STATUS_CONFIG,
} from "@/config/statuses";
import type { LeadStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";

type StageState = "current" | "completed" | "upcoming";

type PipelineStepperProps = {
  status: LeadStatus;
  onChange: (status: LeadStatus) => void;
};

function stageState(stage: LeadStatus, current: LeadStatus): StageState {
  if (stage === current) {
    return "current";
  }
  if (STATUS_CONFIG[stage].isClosed || current === "lost") {
    return "upcoming";
  }
  if (current === "won") {
    return "completed";
  }
  return STATUS_CONFIG[stage].pipelineIndex < STATUS_CONFIG[current].pipelineIndex
    ? "completed"
    : "upcoming";
}

function Stage({ stage, current }: { stage: LeadStatus; current: LeadStatus }) {
  const config = STATUS_CONFIG[stage];
  const state = stageState(stage, current);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupPrimitive.Item
          value={stage}
          className={cn(
            "inline-flex h-9 min-w-0 cursor-pointer items-center justify-center rounded-md px-1.5 text-xs font-medium tracking-tight whitespace-nowrap transition-colors duration-150 ease-out",
            config.isClosed ? "px-3" : "flex-1",
            state === "current" && cn(STATUS_CONFIG[current].tone.solid, "shadow-xs"),
            state === "completed" && STATUS_CONFIG[current].tone.soft,
            state === "upcoming" && "text-muted-foreground hover:bg-surface hover:text-foreground",
          )}
        >
          <span className="truncate">{config.label}</span>
        </ToggleGroupPrimitive.Item>
      </TooltipTrigger>
      <TooltipContent>{config.description}</TooltipContent>
    </Tooltip>
  );
}

export function PipelineStepper({ status, onChange }: PipelineStepperProps) {
  const labelId = useId();
  const handleChange = (value: string) => {
    if (isLeadStatus(value) && value !== status) {
      onChange(value);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-xs font-medium text-muted-foreground">
        {COPY.detail.pipeline}
      </span>
      <ToggleGroupPrimitive.Root
        type="single"
        value={status}
        onValueChange={handleChange}
        aria-labelledby={labelId}
        loop
        className="hidden items-stretch gap-2 sm:flex"
      >
        <div className="flex min-w-0 flex-1 gap-1 rounded-lg bg-surface-sunken p-1">
          {OPEN_STATUSES.map((stage) => (
            <Stage key={stage} stage={stage} current={status} />
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-sunken p-1">
          {CLOSED_STATUSES.map((stage) => (
            <Stage key={stage} stage={stage} current={status} />
          ))}
        </div>
      </ToggleGroupPrimitive.Root>
      <Select value={status} onValueChange={handleChange}>
        <SelectTrigger aria-labelledby={labelId} className="sm:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              <span
                aria-hidden
                className={cn("size-2 rounded-full", STATUS_CONFIG[value].tone.dot)}
              />
              {STATUS_CONFIG[value].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
