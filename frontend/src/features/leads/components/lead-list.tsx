"use client";

import { Plus, SearchX, Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/copy";
import { statusLabel } from "@/config/statuses";
import { LeadRow } from "@/features/leads/components/lead-row";
import { LeadRowsSkeleton } from "@/features/leads/components/lead-list-skeleton";
import type { Lead } from "@/lib/api/types";
import type { LeadListFilters } from "@/lib/query-keys";

type LeadListProps = {
  leads: Lead[];
  totalCount: number | undefined;
  filters: LeadListFilters;
  isFirstUse: boolean;
  hasPinnedMatches: boolean;
  error: unknown;
  isPending: boolean;
  isRefetching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  now: Date;
  selectedLeadId: string | null;
  highlightedLeadId: string | null;
  registerRow: (leadId: string) => (element: HTMLLIElement | null) => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onOpen: (lead: Lead) => void;
  onAddLead?: () => void;
  onClearFilters: () => void;
};

function noResultsTitle(filters: LeadListFilters): string {
  if (filters.q) {
    return COPY.empty.noMatchFor(filters.q);
  }
  if (filters.status) {
    return COPY.empty.noLeadsIn(statusLabel(filters.status));
  }
  return COPY.empty.noResultsTitle;
}

function ListBody(props: LeadListProps) {
  const { leads, filters, error, isFirstUse, hasPinnedMatches } = props;

  if (error && leads.length === 0) {
    return (
      <ErrorState
        heading={COPY.errors.loadLeads}
        error={error}
        onRetry={props.onRetry}
        retrying={props.isRefetching}
      />
    );
  }
  if (isFirstUse) {
    return (
      <EmptyState
        icon={Users}
        title={COPY.empty.firstUseTitle}
        description={COPY.empty.firstUseDescription}
        action={
          props.onAddLead ? (
            <Button onClick={props.onAddLead} className="mt-1">
              <Plus aria-hidden />
              {COPY.actions.addLead}
            </Button>
          ) : null
        }
      />
    );
  }
  if (leads.length === 0 && hasPinnedMatches) {
    return <p className="px-1 text-meta text-muted-foreground">{COPY.empty.allPinned}</p>;
  }
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={noResultsTitle(filters)}
        description={COPY.empty.noResultsDescription}
        action={
          <Button variant="secondary" onClick={props.onClearFilters} className="mt-1">
            {COPY.actions.clearFilters}
          </Button>
        }
      />
    );
  }
  return (
    <>
      <ul className="flex flex-col gap-2">
        {leads.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            now={props.now}
            variant="list"
            selected={props.selectedLeadId === lead.id}
            highlighted={props.highlightedLeadId === lead.id}
            rowRef={props.registerRow(lead.id)}
            onOpen={props.onOpen}
          />
        ))}
      </ul>
      {props.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={props.onLoadMore} loading={props.isFetchingNextPage}>
            {COPY.actions.loadMore}
          </Button>
        </div>
      ) : null}
    </>
  );
}

export function LeadList(props: LeadListProps) {
  if (props.isPending) {
    return <LeadRowsSkeleton />;
  }
  return (
    <section aria-labelledby="all-leads-heading" className="flex flex-col gap-3">
      <SectionHeader
        id="all-leads-heading"
        title={COPY.sections.allLeads}
        count={props.totalCount}
        countLabel={props.totalCount === undefined ? undefined : `${props.totalCount} leads`}
      />
      <ListBody {...props} />
    </section>
  );
}
