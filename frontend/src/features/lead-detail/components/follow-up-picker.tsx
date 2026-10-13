"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COPY } from "@/config/copy";
import { FOLLOW_UP_PRESETS, type FollowUpChoice } from "@/config/follow-up-presets";
import { describeWhen, parseLocalDateTime, resolveFollowUpPreset } from "@/lib/dates";

export type FollowUpDraft = {
  choice: FollowUpChoice;
  customDate: string;
  customTime: string;
};

export function resolveFollowUp(draft: FollowUpDraft, now: Date): Date | null {
  return draft.choice === "custom"
    ? parseLocalDateTime(draft.customDate, draft.customTime)
    : resolveFollowUpPreset(draft.choice, now);
}

type FollowUpPickerProps = {
  value: FollowUpDraft;
  now: Date;
  error: string | null;
  onChange: (value: FollowUpDraft) => void;
};

function isChoice(value: string): value is FollowUpChoice {
  return FOLLOW_UP_PRESETS.some((preset) => preset.id === value);
}

export function FollowUpPicker({ value, now, error, onChange }: FollowUpPickerProps) {
  const idPrefix = useId();
  const resolved = resolveFollowUp(value, now);
  const presets = FOLLOW_UP_PRESETS.filter(
    (preset) => preset.id === "custom" || resolveFollowUpPreset(preset.id, now) !== null,
  );

  return (
    <div className="flex flex-col gap-2.5">
      <ToggleGroup
        type="single"
        value={value.choice}
        onValueChange={(next) => {
          if (isChoice(next)) {
            onChange({ ...value, choice: next });
          }
        }}
        aria-label={COPY.composer.followUpLabel}
        className="flex-wrap"
      >
        {presets.map((preset) => (
          <ToggleGroupItem
            key={preset.id}
            value={preset.id}
            className="h-9 px-3 text-xs sm:h-7 sm:px-2.5"
          >
            {preset.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {value.choice === "custom" ? (
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${idPrefix}-date`} className="text-xs text-muted-foreground">
              {COPY.composer.customDate}
            </Label>
            <Input
              id={`${idPrefix}-date`}
              type="date"
              value={value.customDate}
              onChange={(event) => onChange({ ...value, customDate: event.target.value })}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${idPrefix}-time`} className="text-xs text-muted-foreground">
              {COPY.composer.customTime}
            </Label>
            <Input
              id={`${idPrefix}-time`}
              type="time"
              step={900}
              value={value.customTime}
              onChange={(event) => onChange({ ...value, customTime: event.target.value })}
              aria-invalid={error ? true : undefined}
            />
          </div>
        </div>
      ) : null}
      <p aria-live="polite" className="text-meta font-medium">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : resolved ? (
          COPY.composer.resolved(describeWhen(resolved, now))
        ) : null}
      </p>
    </div>
  );
}
