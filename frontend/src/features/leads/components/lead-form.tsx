"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useId, useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COPY } from "@/config/copy";
import { LIMITS } from "@/config/limits";
import {
  EMPTY_LEAD_FORM,
  type LeadFormInput,
  type LeadFormValues,
  leadFormSchema,
} from "@/features/leads/schemas";
import { isApiError } from "@/lib/api/problem";
import { cn } from "@/lib/cn";

const FORM_FIELDS: ReadonlyArray<FieldPath<LeadFormInput>> = ["name", "company", "phone"];

type DuplicateLead = { id: string; name: string };

type LeadFormProps = {
  defaultValues?: LeadFormInput;
  submitLabel: string;
  pending: boolean;
  autoFocus?: boolean;
  className?: string;
  onSubmit: (values: LeadFormValues) => Promise<unknown>;
  onCancel: () => void;
  onOpenExisting: (leadId: string) => void;
};

type FieldProps = {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};

function Field({ id, label, optional = false, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground">{` ${COPY.addLead.optional}`}</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-meta text-danger">
          {error}
        </p>
      ) : null}
      {hint}
    </div>
  );
}

function duplicateFrom(error: unknown): DuplicateLead | null {
  if (!isApiError(error) || error.status !== 409) {
    return null;
  }
  const id = error.extensionString("existing_lead_id");
  const name = error.extensionString("existing_lead_name");
  return id && name ? { id, name } : null;
}

export function LeadForm({
  defaultValues = EMPTY_LEAD_FORM,
  submitLabel,
  pending,
  autoFocus = false,
  className,
  onSubmit,
  onCancel,
  onOpenExisting,
}: LeadFormProps) {
  const idPrefix = useId();
  const [duplicate, setDuplicate] = useState<DuplicateLead | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LeadFormInput, unknown, LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  async function submit(values: LeadFormValues) {
    setDuplicate(null);
    try {
      await onSubmit(values);
    } catch (error) {
      const existing = duplicateFrom(error);
      if (existing) {
        setDuplicate(existing);
        setError(
          "phone",
          { message: COPY.addLead.duplicatePhone(existing.name) },
          { shouldFocus: true },
        );
        return;
      }
      if (isApiError(error)) {
        for (const field of FORM_FIELDS) {
          const message = error.fieldErrors[field];
          if (message) {
            setError(field, { message });
          }
        }
      }
    }
  }

  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const describedBy = (name: FieldPath<LeadFormInput>) =>
    errors[name] ? `${fieldId(name)}-error` : undefined;

  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className={cn("flex flex-col gap-4", className)}
    >
      <Field id={fieldId("name")} label={COPY.addLead.nameLabel} error={errors.name?.message}>
        <Input
          id={fieldId("name")}
          autoFocus={autoFocus}
          autoComplete="off"
          maxLength={LIMITS.nameMaxLength}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("name")}
          {...register("name")}
        />
      </Field>
      <Field
        id={fieldId("company")}
        label={COPY.addLead.companyLabel}
        optional
        error={errors.company?.message}
      >
        <Input
          id={fieldId("company")}
          autoComplete="off"
          maxLength={LIMITS.companyMaxLength}
          aria-invalid={errors.company ? true : undefined}
          aria-describedby={describedBy("company")}
          {...register("company")}
        />
      </Field>
      <Field
        id={fieldId("phone")}
        label={COPY.addLead.phoneLabel}
        optional
        error={errors.phone?.message}
        hint={
          duplicate ? (
            <Button
              variant="link"
              size="sm"
              className="self-start text-meta"
              onClick={() => onOpenExisting(duplicate.id)}
            >
              {COPY.actions.openExistingLead}
            </Button>
          ) : null
        }
      >
        <Input
          id={fieldId("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder={COPY.addLead.phonePlaceholder}
          maxLength={LIMITS.phoneMaxLength}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={describedBy("phone")}
          {...register("phone")}
        />
      </Field>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          {COPY.actions.cancel}
        </Button>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
