import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  id: string;
  title: string;
  count?: number;
  countTone?: "neutral" | "danger";
  countLabel?: string;
  subtitle?: string;
  className?: string;
  children?: ReactNode;
};

export function SectionHeader({
  id,
  title,
  count,
  countTone = "neutral",
  countLabel,
  subtitle,
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h2 id={id} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {count === undefined ? null : (
            <Badge tone={countTone} aria-label={countLabel}>
              {count}
            </Badge>
          )}
        </div>
        {subtitle ? <p className="text-meta text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
