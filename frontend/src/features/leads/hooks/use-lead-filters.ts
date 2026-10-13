"use client";

import { debounce, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";

import { TIMING } from "@/config/limits";
import { LEAD_STATUSES } from "@/config/statuses";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LeadStatus } from "@/lib/api/types";
import type { LeadListFilters } from "@/lib/query-keys";

const filterParsers = {
  status: parseAsStringLiteral(LEAD_STATUSES),
  q: parseAsString.withDefault(""),
};

export function useLeadFilters() {
  const [{ status, q }, setParams] = useQueryStates(filterParsers, { history: "replace" });
  const debouncedQ = useDebouncedValue(q.trim(), TIMING.searchDebounceMs);

  const filters = useMemo<LeadListFilters>(
    () => ({ status: status ?? null, q: debouncedQ }),
    [status, debouncedQ],
  );

  const setStatus = useCallback(
    (next: LeadStatus | null) => setParams({ status: next }),
    [setParams],
  );

  const setSearch = useCallback(
    (next: string) =>
      setParams({ q: next || null }, { limitUrlUpdates: debounce(TIMING.searchDebounceMs) }),
    [setParams],
  );

  const clearFilters = useCallback(() => setParams({ status: null, q: null }), [setParams]);

  return {
    status: status ?? null,
    search: q,
    filters,
    hasFilters: filters.status !== null || filters.q !== "",
    setStatus,
    setSearch,
    clearFilters,
  };
}
