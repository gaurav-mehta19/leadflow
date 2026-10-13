import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { COPY } from "@/config/copy";

type AppHeaderProps = {
  search?: ReactNode;
  actions?: ReactNode;
};

export function AppHeader({ search, actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-6">
        <h1 className="order-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <TrendingUp aria-hidden className="size-4.5" strokeWidth={2.25} />
          </span>
          {COPY.appName}
        </h1>
        <div className="order-3 w-full sm:order-2 sm:w-auto sm:max-w-md sm:flex-1">{search}</div>
        <div className="order-2 ml-auto flex items-center gap-1.5 sm:order-3">{actions}</div>
      </div>
    </header>
  );
}
