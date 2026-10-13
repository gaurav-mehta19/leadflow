import { z } from "zod";

import { LIMITS } from "@/config/limits";
import type { LeadCreateInput } from "@/lib/api/types";

const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/;

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "").length;
  return (
    PHONE_CHARACTERS.test(value) &&
    digits >= LIMITS.phoneMinDigits &&
    digits <= LIMITS.phoneMaxDigits
  );
}

export const leadFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the lead's name")
    .max(LIMITS.nameMaxLength, `Keep the name under ${LIMITS.nameMaxLength} characters`),
  company: z
    .string()
    .trim()
    .max(LIMITS.companyMaxLength, `Keep the company under ${LIMITS.companyMaxLength} characters`),
  phone: z
    .string()
    .trim()
    .max(LIMITS.phoneMaxLength, `Keep the phone under ${LIMITS.phoneMaxLength} characters`)
    .refine(
      (value) => value === "" || isValidPhone(value),
      `Enter a phone number with ${LIMITS.phoneMinDigits} to ${LIMITS.phoneMaxDigits} digits`,
    ),
});

export type LeadFormInput = z.input<typeof leadFormSchema>;
export type LeadFormValues = z.output<typeof leadFormSchema>;

export const EMPTY_LEAD_FORM: LeadFormInput = { name: "", company: "", phone: "" };

export function toLeadPayload(values: LeadFormValues): LeadCreateInput {
  return {
    name: values.name.replace(/\s+/g, " "),
    company: values.company || null,
    phone: values.phone || null,
  };
}
