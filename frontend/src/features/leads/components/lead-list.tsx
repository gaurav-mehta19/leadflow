"use client";

import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/copy";
import { LeadRow } from "@/features/leads/components/lead-row";
import type { Lead } from "@/lib/api/types";

type LeadListProps = {
  leads: Lead[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  now: Date;
  onLoadMore: () => void;
  onOpen: (lead: Lead) => void;
};

export function LeadList(props: LeadListProps) {
  return (
    <section aria-labelledby="all-leads-heading" className="flex flex-col gap-3">
      <SectionHeader id="all-leads-heading" title={COPY.sections.allLeads} />
      <ul className="flex flex-col gap-2">
        {props.leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} now={props.now} variant="list" onOpen={props.onOpen} />
        ))}
      </ul>
      {props.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={props.onLoadMore} loading={props.isFetchingNextPage}>
            {COPY.actions.loadMore}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
