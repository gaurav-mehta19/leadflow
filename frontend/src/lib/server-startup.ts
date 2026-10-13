import "server-only";

import { getServerEnv } from "@/lib/env";

const BUILD_PHASE = "phase-production-build";

export function validateServerEnvironment(): void {
  if (process.env.NEXT_PHASE === BUILD_PHASE) {
    return;
  }
  try {
    getServerEnv();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
