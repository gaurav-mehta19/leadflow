"use client";

import { type ReactNode, useMemo } from "react";

import { AppHeader } from "@/components/common/app-header";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LeadList } from "@/features/leads/components/lead-list";
import { useLeadParam } from "@/features/leads/hooks/use-lead-param";
import { useLeads } from "@/features/leads/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import type { LeadListFilters } from "@/lib/query-keys";

const ALL_LEADS: LeadListFilters = { status: null, q: "" };

function WorkspaceMain({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
      {children}
    </main>
  );
}

export function LeadsWorkspace() {
  const now = useNow();
  const { openLead } = useLeadParam();
  const leadsQuery = useLeads(ALL_LEADS);
  const leads = useMemo(
    () => leadsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [leadsQuery.data],
  );

  return (
    <>
      <AppHeader actions={<ThemeToggle />} />
      <WorkspaceMain>
        <LeadList
          leads={leads}
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
