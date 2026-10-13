import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { TIMING } from "@/config/limits";
import { errorSummary, isApiError } from "@/lib/api/problem";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      silentErrors?: boolean;
    };
  }
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < TIMING.maxQueryRetries && isApiError(error) && error.isRetryable;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.silentErrors || (isApiError(error) && error.hasFieldErrors)) {
          return;
        }
        const { title, detail } = errorSummary(error);
        toast.error(title, { description: detail });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: TIMING.staleTimeMs,
        refetchOnWindowFocus: true,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
