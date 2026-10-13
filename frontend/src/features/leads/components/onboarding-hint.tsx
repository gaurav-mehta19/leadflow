"use client";

import { Sparkles } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { COPY } from "@/config/copy";
import { safeStorage } from "@/lib/safe-storage";

const DISMISSED_KEY = "leadflow:onboarding-dismissed";

function subscribe(): () => void {
  return () => undefined;
}

function readDismissed(): boolean {
  return safeStorage.get(DISMISSED_KEY) !== null;
}

function dismissedOnServer(): boolean {
  return true;
}

export function OnboardingHint() {
  const storedDismissal = useSyncExternalStore(subscribe, readDismissed, dismissedOnServer);
  const [dismissedNow, setDismissedNow] = useState(false);

  if (storedDismissal || dismissedNow) {
    return null;
  }

  function dismiss() {
    safeStorage.set(DISMISSED_KEY, new Date().toISOString());
    setDismissedNow(true);
  }

  return (
    <aside
      aria-labelledby="onboarding-title"
      className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary-soft/60 p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex flex-1 flex-col gap-3">
        <h2 id="onboarding-title" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles aria-hidden className="size-4 text-primary" />
          {COPY.onboarding.title}
        </h2>
        <ol className="grid gap-2 sm:grid-cols-3 sm:gap-4">
          {COPY.onboarding.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-2 text-meta">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold text-primary-foreground tabular">
                {index + 1}
              </span>
              <span className="pt-px">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <Button variant="secondary" size="sm" onClick={dismiss} className="self-start sm:self-center">
        {COPY.actions.gotIt}
      </Button>
    </aside>
  );
}
