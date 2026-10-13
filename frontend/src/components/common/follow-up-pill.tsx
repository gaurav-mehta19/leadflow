import { cva } from "class-variance-authority";
import { AlarmClock, CalendarClock } from "lucide-react";

import type { FollowUpState } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { followUpPillLabel, isLate } from "@/lib/dates";

export type FollowUpTone = "overdue" | "today" | "late" | "upcoming";

const pillVariants = cva(
  "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 font-mono text-xs font-medium whitespace-nowrap tabular",
  {
    variants: {
      tone: {
        overdue: "bg-danger-soft text-danger",
        late: "bg-danger-soft text-danger",
        today: "bg-warning-soft text-warning",
        upcoming: "bg-surface-sunken text-muted-foreground",
      },
    },
  },
);

export function followUpTone(dueAt: string, state: FollowUpState, now: Date): FollowUpTone | null {
  if (state === "none") {
    return null;
  }
  if (state === "today" && isLate(dueAt, state, now)) {
    return "late";
  }
  return state;
}

type FollowUpPillProps = {
  dueAt: string;
  state: FollowUpState;
  now: Date;
  className?: string;
};

export function FollowUpPill({ dueAt, state, now, className }: FollowUpPillProps) {
  const tone = followUpTone(dueAt, state, now);
  if (tone === null) {
    return null;
  }
  const Icon = tone === "upcoming" ? CalendarClock : AlarmClock;
  return (
    <span data-tone={tone} className={cn(pillVariants({ tone }), className)}>
      <Icon aria-hidden className="size-3.5" />
      {followUpPillLabel(dueAt, state, now)}
    </span>
  );
}
