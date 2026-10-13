"use client";

import { Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/common/app-header";
import { KeyCombo } from "@/components/common/kbd";
import { ShortcutsDialog } from "@/components/common/shortcuts-dialog";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COPY } from "@/config/copy";
import { TIMING } from "@/config/limits";
import { SHORTCUTS } from "@/config/shortcuts";
import { CommandPalette, type PaletteActions } from "@/features/command-palette/command-palette";
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
import { useListNavigation } from "@/features/leads/hooks/use-list-navigation";
import { useAppHotkeys } from "@/hooks/use-app-hotkeys";
import { useNow } from "@/hooks/use-now";
import type { Lead } from "@/lib/api/types";

const FOLLOW_UPS_HEADING_ID = "follow-ups-heading";

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
  const { resolvedTheme, setTheme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);

  const { status, search, filters, hasFilters, setStatus, setSearch, clearFilters } =
    useLeadFilters();
  const { leadId, openLead } = useLeadParam();
  const leadsQuery = useLeads(filters);
  const followUpsQuery = useFollowUps(filters);
  const statsQuery = useLeadStats(filters.q);
  const completeFollowUp = useCompleteFollowUp();

  const followUps = followUpsQuery.data;
  const pinnedLeads = useMemo(
    () => [...(followUps?.overdue ?? []), ...(followUps?.today ?? [])],
    [followUps],
  );
  const listLeads = useMemo(
    () =>
      (leadsQuery.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (lead) => !isPinned(lead),
      ),
    [leadsQuery.data],
  );
  const orderedIds = useMemo(
    () => [...pinnedLeads, ...listLeads].map((lead) => lead.id),
    [pinnedLeads, listLeads],
  );
  const { selectedId, registerRow, select, selectNext, selectPrevious } =
    useListNavigation(orderedIds);

  const stats = statsQuery.data;
  const filteredTotal = stats
    ? filters.status
      ? stats.by_status[filters.status]
      : stats.total
    : undefined;
  const listCount =
    filteredTotal === undefined ? undefined : Math.max(0, filteredTotal - pinnedLeads.length);

  useEffect(() => {
    if (highlightedLeadId === null) {
      return;
    }
    const timeout = setTimeout(() => setHighlightedLeadId(null), TIMING.highlightMs);
    return () => clearTimeout(timeout);
  }, [highlightedLeadId]);

  const open = useCallback(
    (id: string) => {
      select(id);
      void openLead(id);
    },
    [select, openLead],
  );

  const handleCreated = useCallback(
    (lead: Lead) => {
      setHighlightedLeadId(lead.id);
      toast.success(COPY.toasts.leadCreated, {
        action: { label: COPY.actions.open, onClick: () => open(lead.id) },
      });
    },
    [open],
  );

  const paletteActions = useMemo<PaletteActions>(
    () => ({
      addLead: () => setAddOpen(true),
      showOverdue: () => {
        void clearFilters();
        document
          .getElementById(FOLLOW_UPS_HEADING_ID)
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      },
      filterByStatus: (next) => void setStatus(next),
      toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      showShortcuts: () => setShortcutsOpen(true),
      openLead: open,
    }),
    [clearFilters, setStatus, setTheme, resolvedTheme, open],
  );

  useAppHotkeys(
    {
      focusSearch: () => searchRef.current?.focus(),
      newLead: () => setAddOpen(true),
      openCommandPalette: () => setPaletteOpen(true),
      nextLead: selectNext,
      previousLead: selectPrevious,
      openSelectedLead: () => {
        if (selectedId) {
          open(selectedId);
        }
      },
      showShortcuts: () => setShortcutsOpen(true),
    },
    !addOpen && !paletteOpen && !shortcutsOpen && leadId === null,
  );

  return (
    <>
      <AppHeader
        search={<LeadSearch value={search} onChange={setSearch} inputRef={searchRef} />}
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
          headingId={FOLLOW_UPS_HEADING_ID}
          data={followUps}
          error={followUpsQuery.error}
          isPending={followUpsQuery.isPending}
          isRefetching={followUpsQuery.isRefetching}
          now={now}
          selectedLeadId={selectedId}
          completingLeadId={
            completeFollowUp.isPending ? (completeFollowUp.variables ?? null) : null
          }
          registerRow={registerRow}
          onRetry={() => void followUpsQuery.refetch()}
          onOpen={(lead) => open(lead.id)}
          onComplete={(lead) => completeFollowUp.mutate(lead.id)}
        />
        <LeadList
          leads={listLeads}
          totalCount={listCount}
          filters={filters}
          isFirstUse={!hasFilters && stats?.total === 0}
          hasPinnedMatches={pinnedLeads.length > 0}
          error={leadsQuery.error}
          isPending={leadsQuery.isPending}
          isRefetching={leadsQuery.isRefetching}
          hasNextPage={leadsQuery.hasNextPage}
          isFetchingNextPage={leadsQuery.isFetchingNextPage}
          now={now}
          selectedLeadId={selectedId}
          highlightedLeadId={highlightedLeadId}
          registerRow={registerRow}
          onRetry={() => void leadsQuery.refetch()}
          onLoadMore={() => void leadsQuery.fetchNextPage()}
          onOpen={(lead) => open(lead.id)}
          onAddLead={() => setAddOpen(true)}
          onClearFilters={() => void clearFilters()}
        />
      </WorkspaceMain>
      <LeadSheet />
      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleCreated}
        onOpenExisting={open}
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} actions={paletteActions} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
