import { z } from "zod";

import { LIMITS } from "@/config/limits";

export const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write what you discussed before logging the note")
    .max(
      LIMITS.noteMaxLength,
      `Keep notes under ${LIMITS.noteMaxLength.toLocaleString()} characters`,
    ),
});

export function noteBodyError(body: string): string | null {
  const result = noteSchema.safeParse({ body });
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}
