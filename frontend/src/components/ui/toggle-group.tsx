"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm font-medium whitespace-nowrap text-foreground transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-muted data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground sm:h-8 sm:px-3",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
