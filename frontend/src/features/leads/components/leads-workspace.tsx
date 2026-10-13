"use client";

import { Plus } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/common/app-header";
import { KeyCombo } from "@/components/common/kbd";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COPY } from "@/config/copy";
import { TIMING } from "@/config/limits";
import { SHORTCUTS } from "@/config/shortcuts";
import { LeadSheet } from "@/features/lead-detail/components/lead-sheet";
import { isPinned } from "@/features/leads/cache";
import { AddLeadDialog } from "@/features/leads/components/add-lead-dialog";
import { FollowUpsSection } from "@/features/leads/components/follow-ups-section";
import { LeadFilters } from "@/features/leads/components/lead-filters";
import { LeadList } from "@/features/leads/components/lead-list";
import { LeadListSkeleton } from "@/features/leads/components/lead-list-skeleton";
import { LeadSearch } from "@/features/leads/components/lead-search";
import { OnboardingHint } from "@/features/leads/components/onboarding-hint";
import { useCompleteFollowUp } from "@/features/leads/hooks/use-complete-follow-up";
import { useFollowUps } from "@/features/leads/hooks/use-follow-ups";
import { useLeadFilters } from "@/features/leads/hooks/use-lead-filters";
import { useLeadParam } from "@/features/leads/hooks/use-lead-param";
import { useLeadStats } from "@/features/leads/hooks/use-lead-stats";
import { useLeads } from "@/features/leads/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import type { Lead } from "@/lib/api/types";

function WorkspaceMain({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
      {children}
    </main>
  );
}

function AddLeadButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button onClick={onClick}>
          <Plus aria-hidden />
          {COPY.actions.addLead}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {SHORTCUTS.newLead.description}
        <KeyCombo keys={SHORTCUTS.newLead.keys} tone="inverted" />
      </TooltipContent>
    </Tooltip>
  );
}

export function LeadsWorkspaceFallback() {
  return (
    <>
      <AppHeader />
      <WorkspaceMain>
        <LeadListSkeleton />
      </WorkspaceMain>
    </>
  );
}

export function LeadsWorkspace() {
  const now = useNow();
  const [addOpen, setAddOpen] = useState(false);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const { status, search, filters, hasFilters, setStatus, setSearch, clearFilters } =
    useLeadFilters();
  const { openLead } = useLeadParam();
  const leadsQuery = useLeads(filters);
  const followUpsQuery = useFollowUps(filters);
  const statsQuery = useLeadStats(filters.q);
  const completeFollowUp = useCompleteFollowUp();

  const followUps = followUpsQuery.data;
  const pinnedCount = (followUps?.overdue.length ?? 0) + (followUps?.today.length ?? 0);
  const listLeads = useMemo(
    () =>
      (leadsQuery.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (lead) => !isPinned(lead),
      ),
    [leadsQuery.data],
  );

  const stats = statsQuery.data;
  const filteredTotal = stats
    ? filters.status
      ? stats.by_status[filters.status]
      : stats.total
    : undefined;
  const listCount =
    filteredTotal === undefined ? undefined : Math.max(0, filteredTotal - pinnedCount);

  useEffect(() => {
    if (highlightedLeadId === null) {
      return;
    }
    const timeout = setTimeout(() => setHighlightedLeadId(null), TIMING.highlightMs);
    return () => clearTimeout(timeout);
  }, [highlightedLeadId]);

  const handleCreated = useCallback(
    (lead: Lead) => {
      setHighlightedLeadId(lead.id);
      toast.success(COPY.toasts.leadCreated, {
        action: { label: COPY.actions.open, onClick: () => void openLead(lead.id) },
      });
    },
    [openLead],
  );

  return (
    <>
      <AppHeader
        search={<LeadSearch value={search} onChange={setSearch} />}
        actions={
          <>
            <ThemeToggle />
            <AddLeadButton onClick={() => setAddOpen(true)} />
          </>
        }
      />
      <WorkspaceMain>
        <OnboardingHint />
        <LeadFilters
          status={status}
          stats={stats}
          onStatusChange={(next) => void setStatus(next)}
        />
        <FollowUpsSection
          data={followUps}
          error={followUpsQuery.error}
          isPending={followUpsQuery.isPending}
          isRefetching={followUpsQuery.isRefetching}
          now={now}
          completingLeadId={
            completeFollowUp.isPending ? (completeFollowUp.variables ?? null) : null
          }
          onRetry={() => void followUpsQuery.refetch()}
          onOpen={(lead) => void openLead(lead.id)}
          onComplete={(lead) => completeFollowUp.mutate(lead.id)}
        />
        <LeadList
          leads={listLeads}
          totalCount={listCount}
          filters={filters}
          isFirstUse={!hasFilters && stats?.total === 0}
          hasPinnedMatches={pinnedCount > 0}
          error={leadsQuery.error}
          isPending={leadsQuery.isPending}
          isRefetching={leadsQuery.isRefetching}
          hasNextPage={leadsQuery.hasNextPage}
          isFetchingNextPage={leadsQuery.isFetchingNextPage}
          now={now}
          highlightedLeadId={highlightedLeadId}
          onRetry={() => void leadsQuery.refetch()}
          onLoadMore={() => void leadsQuery.fetchNextPage()}
          onOpen={(lead) => void openLead(lead.id)}
          onAddLead={() => setAddOpen(true)}
          onClearFilters={() => void clearFilters()}
        />
      </WorkspaceMain>
      <LeadSheet />
      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleCreated}
        onOpenExisting={(leadId) => void openLead(leadId)}
      />
    </>
  );
}
