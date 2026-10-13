"use client";

import { CircleCheck } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionHeader } from "@/components/common/section-header";
import { COPY } from "@/config/copy";
import { LeadRow } from "@/features/leads/components/lead-row";
import { FollowUpsSkeleton } from "@/features/leads/components/lead-list-skeleton";
import type { FollowUps, Lead } from "@/lib/api/types";
import { cn } from "@/lib/cn";

type FollowUpsSectionProps = {
  data: FollowUps | undefined;
  error: unknown;
  isPending: boolean;
  isRefetching: boolean;
  now: Date;
  completingLeadId: string | null;
  onRetry: () => void;
  onOpen: (lead: Lead) => void;
  onComplete: (lead: Lead) => void;
};

type GroupProps = Pick<
  FollowUpsSectionProps,
  "now" | "completingLeadId" | "onOpen" | "onComplete"
> & {
  id: string;
  label: string;
  leads: Lead[];
  tone: "danger" | "warning";
};

function FollowUpGroup({ id, label, leads, tone, ...rowProps }: GroupProps) {
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <h3
        id={id}
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase",
          tone === "danger" ? "text-danger" : "text-warning",
        )}
      >
        {label}
        <span className="font-mono font-medium tabular">{leads.length}</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {leads.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            now={rowProps.now}
            variant="pinned"
            completing={rowProps.completingLeadId === lead.id}
            onOpen={rowProps.onOpen}
            onComplete={rowProps.onComplete}
          />
        ))}
      </ul>
    </div>
  );
}

export function FollowUpsSection({
  data,
  error,
  isPending,
  isRefetching,
  onRetry,
  ...rowProps
}: FollowUpsSectionProps) {
  if (isPending) {
    return <FollowUpsSkeleton />;
  }
  const overdue = data?.overdue ?? [];
  const today = data?.today ?? [];
  const total = overdue.length + today.length;

  return (
    <section aria-labelledby="follow-ups-heading" className="flex flex-col gap-3">
      <SectionHeader
        id="follow-ups-heading"
        title={COPY.sections.followUps}
        subtitle={COPY.sections.followUpsSubtitle}
        count={data ? total : undefined}
        countTone={total > 0 ? "danger" : "neutral"}
        countLabel={`${total} due`}
      />
      {error && !data ? (
        <ErrorState error={error} onRetry={onRetry} retrying={isRefetching} />
      ) : total === 0 ? (
        <EmptyState
          layout="inline"
          tone="positive"
          icon={CircleCheck}
          title={COPY.empty.caughtUp}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {overdue.length > 0 ? (
            <FollowUpGroup
              id="follow-ups-overdue"
              label={COPY.sections.overdue}
              leads={overdue}
              tone="danger"
              {...rowProps}
            />
          ) : null}
          {today.length > 0 ? (
            <FollowUpGroup
              id="follow-ups-today"
              label={COPY.sections.today}
              leads={today}
              tone="warning"
              {...rowProps}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
