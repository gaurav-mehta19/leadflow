"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchLeadStats } from "@/features/leads/api";
import { leadKeys } from "@/lib/query-keys";

export function useLeadStats(q: string) {
  return useQuery({
    queryKey: leadKeys.stats(q),
    queryFn: ({ signal }) => fetchLeadStats(q, signal),
    placeholderData: keepPreviousData,
  });
}
