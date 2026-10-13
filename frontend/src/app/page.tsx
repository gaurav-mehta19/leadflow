import { Suspense } from "react";

import {
  LeadsWorkspace,
  LeadsWorkspaceFallback,
} from "@/features/leads/components/leads-workspace";

export default function HomePage() {
  return (
    <Suspense fallback={<LeadsWorkspaceFallback />}>
      <LeadsWorkspace />
    </Suspense>
  );
}
