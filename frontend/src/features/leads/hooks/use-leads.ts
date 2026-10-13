"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { fetchLeads } from "@/features/leads/api";
import { type LeadListFilters, leadKeys } from "@/lib/query-keys";

export function useLeads(filters: LeadListFilters) {
  return useInfiniteQuery({
    queryKey: leadKeys.list(filters),
    queryFn: ({ pageParam, signal }) => fetchLeads(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    placeholderData: keepPreviousData,
  });
}
