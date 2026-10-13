"use client";

import { CornerDownLeft } from "lucide-react";
import { type KeyboardEvent, type Ref, useId, useState } from "react";

import { KeyCombo } from "@/components/common/kbd";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { COPY } from "@/config/copy";
import { DEFAULT_FOLLOW_UP_CHOICE } from "@/config/follow-up-presets";
import { LIMITS } from "@/config/limits";
import { SHORTCUTS } from "@/config/shortcuts";
import { isClosedStatus } from "@/config/statuses";
import {
  FollowUpPicker,
  type FollowUpDraft,
  resolveFollowUp,
} from "@/features/lead-detail/components/follow-up-picker";
import { useLogNote } from "@/features/lead-detail/hooks/use-log-note";
import { noteBodyError } from "@/features/lead-detail/schemas";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useNow } from "@/hooks/use-now";
import { isApiError } from "@/lib/api/problem";
import type { Lead } from "@/lib/api/types";
import { defaultCustomFollowUp } from "@/lib/dates";

type NoteComposerProps = {
  lead: Lead;
  followUpEnabled: boolean;
  onFollowUpEnabledChange: (enabled: boolean) => void;
  textareaRef: Ref<HTMLTextAreaElement>;
};

function isSubmitShortcut(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return event.key === "Enter" && (event.metaKey || event.ctrlKey);
}

export function NoteComposer({
  lead,
  followUpEnabled,
  onFollowUpEnabledChange,
  textareaRef,
}: NoteComposerProps) {
  const ids = useId();
  const now = useNow();
  const logNote = useLogNote();
  const { draft, setDraft, clearDraft } = useLocalDraft(lead.id);
  const [followUp, setFollowUp] = useState<FollowUpDraft>(() => {
    const custom = defaultCustomFollowUp(new Date());
    return { choice: DEFAULT_FOLLOW_UP_CHOICE, customDate: custom.date, customTime: custom.time };
  });
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  const closed = isClosedStatus(lead.status);
  const schedulingFollowUp = followUpEnabled && !closed;
  const remaining = LIMITS.noteMaxLength - draft.length;

  function submit() {
    const problem = noteBodyError(draft);
    if (problem) {
      setBodyError(problem);
      return;
    }
    const followUpAt = schedulingFollowUp ? resolveFollowUp(followUp, new Date()) : null;
    if (schedulingFollowUp && followUpAt === null) {
      setFollowUpError(COPY.composer.invalidFollowUp);
      return;
    }
    const body = draft;
    setBodyError(null);
    setFollowUpError(null);
    setDraft("");
    logNote.mutate(
      { leadId: lead.id, body: body.trim(), followUpAt },
      {
        onSuccess: () => {
          clearDraft();
          onFollowUpEnabledChange(false);
        },
        onError: (error) => {
          setDraft(body);
          if (isApiError(error)) {
            setBodyError(error.fieldErrors.body ?? null);
            setFollowUpError(error.fieldErrors.follow_up_at ?? null);
          }
        },
      },
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3"
    >
      <Label htmlFor={`${ids}-note`} className="sr-only">
        {COPY.composer.label}
      </Label>
      <Textarea
        id={`${ids}-note`}
        ref={textareaRef}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setBodyError(null);
        }}
        onKeyDown={(event) => {
          if (isSubmitShortcut(event)) {
            event.preventDefault();
            submit();
          }
        }}
        maxLength={LIMITS.noteMaxLength}
        placeholder={COPY.composer.placeholder}
        aria-invalid={bodyError ? true : undefined}
        aria-describedby={bodyError ? `${ids}-note-error` : undefined}
        className="max-h-48 min-h-[4.5rem]"
      />
      {bodyError || draft.length > LIMITS.noteCounterThreshold ? (
        <div className="-mt-1.5 flex items-center justify-between gap-2 text-meta">
          <span
            id={`${ids}-note-error`}
            role={bodyError ? "alert" : undefined}
            className="text-danger"
          >
            {bodyError}
          </span>
          {draft.length > LIMITS.noteCounterThreshold ? (
            <span className="font-mono text-xs text-muted-foreground tabular" aria-live="polite">
              {COPY.composer.charactersLeft(remaining)}
            </span>
          ) : null}
        </div>
      ) : null}
      {closed ? (
        <p className="text-meta text-muted-foreground">{COPY.composer.closedLeadHint}</p>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <Switch
              id={`${ids}-follow-up`}
              checked={followUpEnabled}
              onCheckedChange={onFollowUpEnabledChange}
            />
            <Label htmlFor={`${ids}-follow-up`} className="cursor-pointer">
              {COPY.composer.setFollowUp}
            </Label>
          </div>
          {followUpEnabled ? (
            <FollowUpPicker
              value={followUp}
              now={now}
              error={followUpError}
              onChange={(next) => {
                setFollowUp(next);
                setFollowUpError(null);
              }}
            />
          ) : null}
        </>
      )}
      <div className="flex items-center justify-end gap-3">
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <KeyCombo keys={SHORTCUTS.logNote.keys} />
        </span>
        <Button type="submit" disabled={!draft.trim() || logNote.isPending}>
          <CornerDownLeft aria-hidden />
          {COPY.actions.logNote}
        </Button>
      </div>
    </form>
  );
}
