"use client";

import { CircleCheck } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/section-header";
import { COPY } from "@/config/copy";
import { LeadRow } from "@/features/leads/components/lead-row";
import type { FollowUps, Lead } from "@/lib/api/types";
import { cn } from "@/lib/cn";

type FollowUpsSectionProps = {
  data: FollowUps | undefined;
  now: Date;
  completingLeadId: string | null;
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

export function FollowUpsSection({ data, ...rowProps }: FollowUpsSectionProps) {
  if (!data) {
    return null;
  }
  const total = data.overdue.length + data.today.length;

  return (
    <section aria-labelledby="follow-ups-heading" className="flex flex-col gap-3">
      <SectionHeader
        id="follow-ups-heading"
        title={COPY.sections.followUps}
        subtitle={COPY.sections.followUpsSubtitle}
        count={total}
        countTone={total > 0 ? "danger" : "neutral"}
        countLabel={`${total} due`}
      />
      {total === 0 ? (
        <EmptyState
          layout="inline"
          tone="positive"
          icon={CircleCheck}
          title={COPY.empty.caughtUp}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {data.overdue.length > 0 ? (
            <FollowUpGroup
              id="follow-ups-overdue"
              label={COPY.sections.overdue}
              leads={data.overdue}
              tone="danger"
              {...rowProps}
            />
          ) : null}
          {data.today.length > 0 ? (
            <FollowUpGroup
              id="follow-ups-today"
              label={COPY.sections.today}
              leads={data.today}
              tone="warning"
              {...rowProps}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
