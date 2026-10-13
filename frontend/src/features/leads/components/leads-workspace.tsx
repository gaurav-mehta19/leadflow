"use client";

import { type ReactNode, useMemo } from "react";

import { AppHeader } from "@/components/common/app-header";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LeadFilters } from "@/features/leads/components/lead-filters";
import { LeadList } from "@/features/leads/components/lead-list";
import { LeadSearch } from "@/features/leads/components/lead-search";
import { useLeadFilters } from "@/features/leads/hooks/use-lead-filters";
import { useLeadParam } from "@/features/leads/hooks/use-lead-param";
import { useLeadStats } from "@/features/leads/hooks/use-lead-stats";
import { useLeads } from "@/features/leads/hooks/use-leads";
import { useNow } from "@/hooks/use-now";

function WorkspaceMain({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
      {children}
    </main>
  );
}

export function LeadsWorkspace() {
  const now = useNow();
  const { status, search, filters, setStatus, setSearch } = useLeadFilters();
  const { openLead } = useLeadParam();
  const leadsQuery = useLeads(filters);
  const statsQuery = useLeadStats(filters.q);
  const leads = useMemo(
    () => leadsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [leadsQuery.data],
  );

  const stats = statsQuery.data;
  const totalCount = stats
    ? filters.status
      ? stats.by_status[filters.status]
      : stats.total
    : undefined;

  return (
    <>
      <AppHeader
        search={<LeadSearch value={search} onChange={setSearch} />}
        actions={<ThemeToggle />}
      />
      <WorkspaceMain>
        <LeadFilters
          status={status}
          stats={stats}
          onStatusChange={(next) => void setStatus(next)}
        />
        <LeadList
          leads={leads}
          totalCount={totalCount}
          hasNextPage={leadsQuery.hasNextPage}
          isFetchingNextPage={leadsQuery.isFetchingNextPage}
          now={now}
          onLoadMore={() => void leadsQuery.fetchNextPage()}
          onOpen={(lead) => void openLead(lead.id)}
        />
      </WorkspaceMain>
    </>
  );
}
