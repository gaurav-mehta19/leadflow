"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { useIsMac } from "@/hooks/use-is-mac";
import { cn } from "@/lib/cn";

const kbdVariants = cva(
  "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 font-mono text-[11px] leading-none font-medium",
  {
    variants: {
      tone: {
        default: "border bg-surface-sunken text-muted-foreground",
        inverted: "bg-background/15 text-background",
        onPrimary: "bg-primary-foreground/20 text-primary-foreground",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

type KbdProps = ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>;

function Kbd({ className, tone, ...props }: KbdProps) {
  return <kbd data-slot="kbd" className={cn(kbdVariants({ tone }), className)} {...props} />;
}

function useKeyLabel(): (key: string) => string {
  const isMac = useIsMac();
  return (key) => (key === "mod" ? (isMac ? "⌘" : "Ctrl") : key);
}

function KeyCombo({
  keys,
  tone,
  className,
}: { keys: readonly string[]; className?: string } & VariantProps<typeof kbdVariants>) {
  const label = useKeyLabel();
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((key) => (
        <Kbd key={key} tone={tone}>
          {label(key)}
        </Kbd>
      ))}
    </span>
  );
}

export { KeyCombo, Kbd };
