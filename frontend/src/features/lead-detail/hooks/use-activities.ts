"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchActivities } from "@/features/lead-detail/api";
import { activityKeys } from "@/lib/query-keys";

export function useActivities(leadId: string) {
  return useInfiniteQuery({
    queryKey: activityKeys.list(leadId),
    queryFn: ({ pageParam, signal }) => fetchActivities(leadId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });
}
