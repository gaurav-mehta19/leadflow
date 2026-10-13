import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const emptyStateVariants = cva("flex rounded-xl border border-dashed", {
  variants: {
    layout: {
      block: "flex-col items-center gap-3 px-6 py-12 text-center",
      inline: "items-center gap-3 px-4 py-3.5",
    },
    tone: {
      neutral: "bg-surface",
      positive: "border-success/30 bg-success-soft/50",
    },
  },
  defaultVariants: { layout: "block", tone: "neutral" },
});

const iconVariants = cva("flex shrink-0 items-center justify-center rounded-full", {
  variants: {
    layout: { block: "size-11", inline: "size-8" },
    tone: {
      neutral: "bg-surface-sunken text-muted-foreground",
      positive: "bg-success-soft text-success",
    },
  },
  defaultVariants: { layout: "block", tone: "neutral" },
});

type EmptyStateProps = VariantProps<typeof emptyStateVariants> & {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  layout,
  tone,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ layout, tone }), className)}>
      <span className={iconVariants({ layout, tone })}>
        <Icon aria-hidden className={layout === "inline" ? "size-4" : "size-5"} />
      </span>
      <div
        className={cn(
          "flex flex-col gap-1",
          layout === "inline" ? "flex-1" : "max-w-sm text-balance",
        )}
      >
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-meta text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
