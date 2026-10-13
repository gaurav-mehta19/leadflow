import { cva, type VariantProps } from "class-variance-authority";

import { STATUS_CONFIG } from "@/config/statuses";
import type { LeadStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";

const statusBadgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
  {
    variants: {
      size: {
        default: "h-6 px-2.5 text-xs",
        sm: "h-5 px-2 text-[11px]",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type StatusBadgeProps = VariantProps<typeof statusBadgeVariants> & {
  status: LeadStatus;
  className?: string;
};

export function StatusBadge({ status, size, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      data-status={status}
      className={cn(statusBadgeVariants({ size }), config.tone.badge, className)}
    >
      <span
        aria-hidden
        data-slot="status-dot"
        className={cn("size-1.5 rounded-full", config.tone.dot)}
      />
      {config.label}
    </span>
  );
}
