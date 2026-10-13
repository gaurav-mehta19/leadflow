"use client";

import { MessageSquareText } from "lucide-react";
import { useMemo } from "react";

import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COPY } from "@/config/copy";
import { TimelineDayGroup } from "@/features/lead-detail/components/timeline-day-group";
import { useActivities } from "@/features/lead-detail/hooks/use-activities";
import type { Activity } from "@/lib/api/types";
import { dayKey, dayLabel } from "@/lib/dates";

type DayGroup = { key: string; label: string; activities: Activity[] };

function groupByDay(activities: Activity[], now: Date): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const activity of activities) {
    const key = dayKey(activity.occurred_at);
    const last = groups.at(-1);
    if (last?.key === key) {
      last.activities.push(activity);
    } else {
      groups.push({ key, label: dayLabel(activity.occurred_at, now), activities: [activity] });
    }
  }
  return groups;
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

export function Timeline({ leadId, now }: { leadId: string; now: Date }) {
  const query = useActivities(leadId);
  const activities = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const groups = useMemo(() => groupByDay(activities, now), [activities, now]);
  const hasNotes = activities.some((activity) => activity.kind === "note");

  return (
    <section aria-label={COPY.detail.timeline} className="flex flex-col gap-4">
      {query.isPending ? (
        <TimelineSkeleton />
      ) : query.error && activities.length === 0 ? (
        <ErrorState
          heading={COPY.errors.loadTimeline}
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isRefetching}
        />
      ) : (
        <>
          {hasNotes ? null : (
            <p className="flex items-center gap-2 rounded-xl border border-dashed px-3.5 py-3 text-meta text-muted-foreground">
              <MessageSquareText aria-hidden className="size-4 shrink-0" />
              {COPY.empty.timeline}
            </p>
          )}
          {groups.map((group) => (
            <TimelineDayGroup
              key={group.key}
              label={group.label}
              activities={group.activities}
              now={now}
            />
          ))}
          {query.hasNextPage ? (
            <Button
              variant="secondary"
              size="sm"
              className="self-center"
              onClick={() => void query.fetchNextPage()}
              loading={query.isFetchingNextPage}
            >
              {COPY.actions.showOlder}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
