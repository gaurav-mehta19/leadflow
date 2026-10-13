"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/cn";
import { formatAbsolute, formatRelative } from "@/lib/dates";

export function RelativeTime({ value, className }: { value: string; className?: string }) {
  const now = useNow();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={value}
          className={cn(
            "font-mono text-xs whitespace-nowrap text-muted-foreground tabular",
            className,
          )}
        >
          {formatRelative(value, now)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatAbsolute(value)}</TooltipContent>
    </Tooltip>
  );
}
