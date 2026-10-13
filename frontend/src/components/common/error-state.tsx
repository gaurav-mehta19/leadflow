import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COPY } from "@/config/copy";
import { errorSummary } from "@/lib/api/problem";
import { cn } from "@/lib/cn";

type ErrorStateProps = {
  error: unknown;
  heading?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

export function ErrorState({
  error,
  heading,
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  const { title, detail, requestId } = errorSummary(error);
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft/60 p-4 sm:flex-row sm:items-center",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert aria-hidden className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">{heading ?? title}</p>
        <p className="text-meta text-muted-foreground">
          {heading ? `${title}. ${detail}` : detail}
        </p>
        {requestId ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            {COPY.errors.requestId}: {requestId}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
          {retrying ? null : <RotateCw aria-hidden />}
          {COPY.actions.tryAgain}
        </Button>
      ) : null}
    </div>
  );
}
