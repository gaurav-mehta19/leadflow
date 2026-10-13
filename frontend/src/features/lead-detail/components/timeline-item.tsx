import {
  ArrowRightLeft,
  CalendarClock,
  CircleCheck,
  type LucideIcon,
  UserPlus,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { COPY } from "@/config/copy";
import { isLeadStatus } from "@/config/statuses";
import { isOptimistic } from "@/features/leads/cache";
import type { Activity } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { describeWhen, formatAbsolute, formatTime } from "@/lib/dates";

type TimelineItemProps = {
  activity: Activity;
  now: Date;
};

function Time({ value }: { value: string }) {
  return (
    <time
      dateTime={value}
      title={formatAbsolute(value)}
      className="shrink-0 font-mono text-xs text-muted-foreground tabular"
    >
      {formatTime(value)}
    </time>
  );
}

function SystemEvent({
  icon: Icon,
  occurredAt,
  children,
}: {
  icon: LucideIcon;
  occurredAt: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 px-1 py-1 text-meta text-muted-foreground">
      <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken">
        <Icon aria-hidden className="size-3" />
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</span>
      <Time value={occurredAt} />
    </div>
  );
}

function NoteCard({ activity, now }: TimelineItemProps) {
  const pending = isOptimistic(activity);
  return (
    <article
      aria-busy={pending || undefined}
      className={cn(
        "rounded-xl border bg-surface p-3.5 shadow-xs transition-opacity",
        pending && "opacity-70",
      )}
    >
      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{activity.body}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Time value={activity.occurred_at} />
        {activity.follow_up_at ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-primary-soft px-2 text-xs font-medium text-primary">
            <CalendarClock aria-hidden className="size-3.5" />
            {COPY.detail.followUpSetFor(describeWhen(activity.follow_up_at, now))}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function TimelineItem({ activity, now }: TimelineItemProps) {
  const meta = activity.meta ?? {};
  switch (activity.kind) {
    case "note":
      return <NoteCard activity={activity} now={now} />;
    case "lead_created":
      return (
        <SystemEvent icon={UserPlus} occurredAt={activity.occurred_at}>
          {COPY.detail.leadCreated}
        </SystemEvent>
      );
    case "status_changed": {
      const from = meta.from;
      const to = meta.to;
      return (
        <SystemEvent icon={ArrowRightLeft} occurredAt={activity.occurred_at}>
          {COPY.detail.statusChanged}
          {isLeadStatus(from) ? <StatusBadge status={from} size="sm" /> : null}
          {COPY.detail.to}
          {isLeadStatus(to) ? <StatusBadge status={to} size="sm" /> : null}
          {meta.cleared_follow_up_at ? (
            <span>
              · {COPY.detail.clearedFollowUp(describeWhen(meta.cleared_follow_up_at, now))}
            </span>
          ) : null}
        </SystemEvent>
      );
    }
    case "follow_up_completed":
      return (
        <SystemEvent icon={CircleCheck} occurredAt={activity.occurred_at}>
          {COPY.detail.followUpCompleted}
          {meta.due_at ? <span>{COPY.detail.wasDue(describeWhen(meta.due_at, now))}</span> : null}
        </SystemEvent>
      );
  }
}
