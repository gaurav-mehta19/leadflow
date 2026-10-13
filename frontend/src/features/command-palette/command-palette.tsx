"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  Keyboard,
  ListFilter,
  type LucideIcon,
  Plus,
  SunMoon,
  Users,
} from "lucide-react";
import { useState } from "react";

import { LeadAvatar } from "@/components/common/lead-avatar";
import { StatusBadge } from "@/components/common/status-badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "@/components/ui/command";
import { COPY } from "@/config/copy";
import { LIMITS, TIMING } from "@/config/limits";
import { LEAD_STATUSES, STATUS_CONFIG } from "@/config/statuses";
import { fetchLeads } from "@/features/leads/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LeadStatus } from "@/lib/api/types";
import { leadKeys } from "@/lib/query-keys";

const PALETTE_RESULTS = 8;

export type PaletteActions = {
  addLead: () => void;
  showOverdue: () => void;
  filterByStatus: (status: LeadStatus | null) => void;
  toggleTheme: () => void;
  showShortcuts: () => void;
  openLead: (leadId: string) => void;
};

type PaletteAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: PaletteActions;
};

function buildActions(actions: PaletteActions): PaletteAction[] {
  return [
    { id: "add-lead", label: COPY.actions.addLead, icon: Plus, run: actions.addLead },
    { id: "overdue", label: COPY.palette.showOverdue, icon: AlarmClock, run: actions.showOverdue },
    {
      id: "all",
      label: COPY.palette.showAll,
      icon: Users,
      run: () => actions.filterByStatus(null),
    },
    ...LEAD_STATUSES.map((status) => ({
      id: `filter-${status}`,
      label: COPY.palette.filterBy(STATUS_CONFIG[status].label),
      icon: ListFilter,
      run: () => actions.filterByStatus(status),
    })),
    { id: "theme", label: COPY.actions.toggleTheme, icon: SunMoon, run: actions.toggleTheme },
    {
      id: "shortcuts",
      label: COPY.actions.keyboardShortcuts,
      icon: Keyboard,
      run: actions.showShortcuts,
    },
  ];
}

export function CommandPalette({ open, onOpenChange, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const term = useDebouncedValue(query.trim(), TIMING.searchDebounceMs);
  const leadsQuery = useQuery({
    queryKey: leadKeys.search(term),
    queryFn: ({ signal }) => fetchLeads({ status: null, q: term }, null, signal, PALETTE_RESULTS),
    enabled: open && term.length > 0,
  });
  const matchingActions = buildActions(actions).filter((action) =>
    action.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const leads = term ? (leadsQuery.data?.items ?? []) : [];
  const searching = term !== query.trim() || leadsQuery.isFetching;

  function run(action: () => void) {
    onOpenChange(false);
    setQuery("");
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQuery("");
        }
      }}
      title={COPY.palette.placeholder}
      description={COPY.palette.placeholder}
      commandProps={{ shouldFilter: false, loop: true }}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={COPY.palette.placeholder}
        maxLength={LIMITS.searchMaxLength}
      />
      <CommandList>
        {searching && leads.length === 0 && query.trim() ? (
          <CommandLoading>{COPY.palette.searching}</CommandLoading>
        ) : null}
        {!searching && leads.length === 0 && matchingActions.length === 0 ? (
          <CommandEmpty>{COPY.palette.empty}</CommandEmpty>
        ) : null}
        {leads.length > 0 ? (
          <CommandGroup heading={COPY.palette.leads}>
            {leads.map((lead) => (
              <CommandItem
                key={lead.id}
                value={`lead-${lead.id}`}
                onSelect={() => run(() => actions.openLead(lead.id))}
              >
                <LeadAvatar name={lead.name} className="size-7 text-[10px]" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{lead.name}</span>
                  {lead.company ? (
                    <span className="truncate text-xs text-muted-foreground">{lead.company}</span>
                  ) : null}
                </span>
                <StatusBadge status={lead.status} size="sm" />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {matchingActions.length > 0 ? (
          <CommandGroup heading={COPY.palette.actions}>
            {matchingActions.map((action) => (
              <CommandItem key={action.id} value={action.id} onSelect={() => run(action.run)}>
                <action.icon aria-hidden className="text-muted-foreground" />
                {action.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
