"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchFollowUps } from "@/features/leads/api";
import { type LeadListFilters, leadKeys } from "@/lib/query-keys";

export function useFollowUps(filters: LeadListFilters) {
  return useQuery({
    queryKey: leadKeys.followUps(filters),
    queryFn: ({ signal }) => fetchFollowUps(filters, signal),
    placeholderData: keepPreviousData,
  });
}
