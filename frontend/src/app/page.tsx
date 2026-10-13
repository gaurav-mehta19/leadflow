import { Suspense } from "react";

import { AppHeader } from "@/components/common/app-header";
import { LeadsWorkspace } from "@/features/leads/components/leads-workspace";

export default function HomePage() {
  return (
    <Suspense fallback={<AppHeader />}>
      <LeadsWorkspace />
    </Suspense>
  );
}
