import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { COPY } from "@/config/copy";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Compass aria-hidden className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-xs text-muted-foreground tabular">404</p>
        <h1 className="text-xl font-semibold">{COPY.errors.notFoundTitle}</h1>
        <p className="text-sm text-muted-foreground">{COPY.errors.notFoundDescription}</p>
      </div>
      <Button asChild>
        <Link href="/">{COPY.errors.backToLeads}</Link>
      </Button>
    </main>
  );
}
