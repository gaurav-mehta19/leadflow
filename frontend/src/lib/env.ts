import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  API_INTERNAL_URL: z.url({
    message: "API_INTERNAL_URL must be an absolute URL such as http://localhost:8000",
  }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment.\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
