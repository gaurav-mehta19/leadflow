"use client";

import { cva } from "class-variance-authority";
import { Check } from "lucide-react";
import { type Ref, useId } from "react";

import { FollowUpPill } from "@/components/common/follow-up-pill";
import { LeadAvatar } from "@/components/common/lead-avatar";
import { RelativeTime } from "@/components/common/relative-time";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COPY } from "@/config/copy";
import { isClosedStatus } from "@/config/statuses";
import { IdleTag } from "@/features/leads/components/idle-tag";
import type { Lead } from "@/lib/api/types";
import { cn } from "@/lib/cn";

export type LeadRowVariant = "list" | "pinned";

const rowVariants = cva(
  "group relative flex animate-row-in items-stretch rounded-xl border transition-[background-color,border-color] duration-150 ease-out",
  {
    variants: {
      emphasis: {
        open: "bg-surface hover:border-border-strong hover:bg-surface-muted",
        closed: "bg-surface-muted text-muted-foreground hover:border-border-strong",
      },
      accent: {
        none: "",
        danger:
          "before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-xl before:bg-danger",
      },
      selected: {
        true: "border-primary/60 bg-primary-soft/40 hover:bg-primary-soft/50",
        false: "",
      },
      highlighted: {
        true: "animate-highlight",
        false: "",
      },
    },
    defaultVariants: { emphasis: "open", accent: "none", selected: false, highlighted: false },
  },
);

type LeadRowProps = {
  lead: Lead;
  now: Date;
  variant: LeadRowVariant;
  selected?: boolean;
  highlighted?: boolean;
  completing?: boolean;
  rowRef?: Ref<HTMLLIElement>;
  onOpen: (lead: Lead) => void;
  onComplete?: (lead: Lead) => void;
};

function showsFollowUp(
  lead: Lead,
  variant: LeadRowVariant,
): lead is Lead & { next_follow_up_at: string } {
  if (lead.next_follow_up_at === null || lead.follow_up_state === "none") {
    return false;
  }
  return variant === "pinned" || lead.follow_up_state === "upcoming";
}

export function LeadRow({
  lead,
  now,
  variant,
  selected = false,
  highlighted = false,
  completing = false,
  rowRef,
  onOpen,
  onComplete,
}: LeadRowProps) {
  const metaId = useId();
  const closed = isClosedStatus(lead.status);

  return (
    <li
      ref={rowRef}
      data-lead-id={lead.id}
      data-selected={selected || undefined}
      className={rowVariants({
        emphasis: closed ? "closed" : "open",
        accent: variant === "pinned" && lead.follow_up_state === "overdue" ? "danger" : "none",
        selected,
        highlighted,
      })}
    >
      <button
        type="button"
        onClick={() => onOpen(lead)}
        aria-label={COPY.lead.open(lead.name, lead.company)}
        aria-describedby={metaId}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-xl p-3 text-left sm:px-4"
      >
        <LeadAvatar name={lead.name} className={cn(closed && "opacity-70")} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn("truncate", closed ? "font-medium" : "font-semibold text-foreground")}
            >
              {lead.name}
            </span>
            {lead.company ? (
              <span className="hidden truncate text-meta text-muted-foreground sm:inline">
                {lead.company}
              </span>
            ) : null}
            <StatusBadge status={lead.status} className="ml-auto" />
          </div>
          <div id={metaId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-meta">
            {lead.company ? (
              <span className="w-full truncate text-muted-foreground sm:hidden">
                {lead.company}
              </span>
            ) : null}
            {lead.last_note ? (
              <span className="flex min-w-0 flex-1 basis-56 items-center gap-1.5">
                <span className="shrink-0 font-medium text-muted-foreground">
                  {COPY.lead.lastNote}
                </span>
                <span className="min-w-0 truncate">{lead.last_note.preview}</span>
                <span aria-hidden className="text-border-strong">
                  ·
                </span>
                <RelativeTime value={lead.last_note.occurred_at} className="shrink-0" />
              </span>
            ) : (
              <span className="flex-1 basis-56 text-muted-foreground italic">
                {COPY.empty.noDiscussions}
              </span>
            )}
            {showsFollowUp(lead, variant) || lead.is_stale ? (
              <span className="flex shrink-0 items-center gap-1.5">
                {showsFollowUp(lead, variant) ? (
                  <FollowUpPill
                    dueAt={lead.next_follow_up_at}
                    state={lead.follow_up_state}
                    now={now}
                  />
                ) : null}
                {lead.is_stale ? <IdleTag days={lead.idle_days} /> : null}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      {variant === "pinned" && onComplete ? (
        <div className="flex items-center pr-2 sm:pr-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                loading={completing}
                onClick={() => onComplete(lead)}
                aria-label={`${COPY.actions.markFollowUpDone}: ${lead.name}`}
                className="text-muted-foreground transition-opacity hover:bg-success-soft hover:text-success [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
              >
                {completing ? null : <Check aria-hidden />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{COPY.actions.markFollowUpDone}</TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </li>
  );
}
