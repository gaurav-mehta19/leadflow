"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COPY } from "@/config/copy";

type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function RouteError({ error, retry }: RouteErrorProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert aria-hidden className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold">{COPY.errors.genericTitle}</h1>
        <p className="text-sm text-muted-foreground">{COPY.errors.genericDetail}</p>
        {error.digest ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            {COPY.errors.requestId}: {error.digest}
          </p>
        ) : null}
      </div>
      <Button onClick={retry}>
        <RotateCw aria-hidden />
        {COPY.actions.tryAgain}
      </Button>
    </main>
  );
}
