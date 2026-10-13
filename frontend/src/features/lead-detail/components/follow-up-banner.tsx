"use client";

import { cva } from "class-variance-authority";
import { AlarmClock, CalendarClock, Check, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COPY } from "@/config/copy";
import type { Lead } from "@/lib/api/types";
import { describeWhen, formatTime, lateBy } from "@/lib/dates";

const bannerVariants = cva(
  "flex flex-col gap-3 rounded-xl border px-3.5 py-3 sm:flex-row sm:items-center",
  {
    variants: {
      tone: {
        overdue: "border-danger/30 bg-danger-soft text-danger",
        today: "border-warning/30 bg-warning-soft text-warning",
        upcoming: "bg-surface-sunken text-foreground",
      },
    },
  },
);

type FollowUpBannerProps = {
  lead: Lead;
  now: Date;
  completing: boolean;
  onMarkDone: () => void;
  onReschedule: () => void;
};

function bannerText(dueAt: string, state: Lead["follow_up_state"], now: Date): string {
  if (state === "overdue") {
    return COPY.detail.followUpBanner.overdue(describeWhen(dueAt, now));
  }
  if (state === "today") {
    const late = lateBy(dueAt, now);
    const text = COPY.detail.followUpBanner.today(formatTime(dueAt));
    return late ? `${text} · ${late} late` : text;
  }
  return COPY.detail.followUpBanner.upcoming(describeWhen(dueAt, now));
}

export function FollowUpBanner({
  lead,
  now,
  completing,
  onMarkDone,
  onReschedule,
}: FollowUpBannerProps) {
  const dueAt = lead.next_follow_up_at;
  const state = lead.follow_up_state;
  if (dueAt === null || state === "none") {
    return null;
  }
  const Icon = state === "upcoming" ? CalendarClock : AlarmClock;
  return (
    <div role="status" className={bannerVariants({ tone: state })}>
      <p className="flex flex-1 items-center gap-2 text-sm font-medium">
        <Icon aria-hidden className="size-4 shrink-0" />
        {bannerText(dueAt, state, now)}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onMarkDone} loading={completing}>
          {completing ? null : <Check aria-hidden />}
          {COPY.actions.markDone}
        </Button>
        <Button variant="ghost" size="sm" onClick={onReschedule} className="text-current">
          <Pencil aria-hidden />
          {COPY.actions.reschedule}
        </Button>
      </div>
    </div>
  );
}
