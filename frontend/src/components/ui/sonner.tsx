"use client";

import { useTheme } from "next-themes";
import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

import { useMediaQuery } from "@/hooks/use-media-query";

const toastStyle = {
  "--normal-bg": "var(--surface)",
  "--normal-text": "var(--foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
  pointerEvents: "auto",
} as CSSProperties;

function Toaster() {
  const { resolvedTheme } = useTheme();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position={isDesktop ? "bottom-left" : "top-center"}
      closeButton
      style={toastStyle}
      toastOptions={{
        classNames: { toast: "shadow-float font-sans", description: "text-muted-foreground" },
      }}
    />
  );
}

export { Toaster };
