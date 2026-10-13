import { useId } from "react";

import { TimelineItem } from "@/features/lead-detail/components/timeline-item";
import type { Activity } from "@/lib/api/types";

type TimelineDayGroupProps = {
  label: string;
  activities: Activity[];
  now: Date;
};

export function TimelineDayGroup({ label, activities, now }: TimelineDayGroupProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3
        id={headingId}
        className="sticky top-0 z-10 -mx-1 bg-surface/95 px-1 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
      >
        {label}
      </h3>
      <ol className="flex flex-col gap-2">
        {activities.map((activity) => (
          <li key={activity.id} className="animate-row-in">
            <TimelineItem activity={activity} now={now} />
          </li>
        ))}
      </ol>
    </section>
  );
}
