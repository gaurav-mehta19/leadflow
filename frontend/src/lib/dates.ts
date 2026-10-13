import {
  addBusinessDays,
  addDays,
  addHours,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  formatISO,
  isSameDay,
  isSameYear,
  isValid,
  nextMonday,
  parse,
  set,
} from "date-fns";

import type { FollowUpState } from "@/lib/api/types";

export type DateInput = string | Date;

export type FollowUpPresetId = "later_today" | "tomorrow" | "two_business_days" | "next_monday";

const MINUTE_MS = 60_000;
const QUARTER_HOUR_MS = 15 * MINUTE_MS;
const FOLLOW_UP_HOUR = 10;
const LATER_TODAY_HOURS = 3;

export function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function toOffsetIso(value: Date): string {
  return formatISO(value);
}

export function formatTime(value: DateInput): string {
  return format(toDate(value), "h:mm a");
}

export function formatAbsolute(value: DateInput): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    toDate(value),
  );
}

export function formatRelative(value: DateInput, now: Date): string {
  const date = toDate(value);
  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}w ago`;
  }
  return format(date, isSameYear(date, now) ? "d MMM" : "d MMM yyyy");
}

export function dayKey(value: DateInput): string {
  return format(toDate(value), "yyyy-MM-dd");
}

export function dayLabel(value: DateInput, now: Date): string {
  const date = toDate(value);
  const daysAgo = differenceInCalendarDays(now, date);
  if (daysAgo === 0) {
    return "Today";
  }
  if (daysAgo === 1) {
    return "Yesterday";
  }
  return format(date, isSameYear(date, now) ? "EEE, d MMM" : "EEE, d MMM yyyy");
}

export function describeWhen(value: DateInput, now: Date): string {
  const date = toDate(value);
  const time = formatTime(date);
  const daysAhead = differenceInCalendarDays(date, now);
  if (daysAhead === 0) {
    return `Today, ${time}`;
  }
  if (daysAhead === 1) {
    return `Tomorrow, ${time}`;
  }
  if (daysAhead === -1) {
    return `Yesterday, ${time}`;
  }
  if (daysAhead > 1 && daysAhead < 7) {
    return `${format(date, "EEE")}, ${time}`;
  }
  return `${format(date, isSameYear(date, now) ? "EEE, d MMM" : "EEE, d MMM yyyy")}, ${time}`;
}

function formatDuration(minutes: number): string {
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
}

export function lateBy(value: DateInput, now: Date): string | null {
  const date = toDate(value);
  const minutes = differenceInMinutes(now, date);
  if (minutes < 1 || !isSameDay(date, now)) {
    return null;
  }
  return formatDuration(minutes);
}

export function overdueDays(value: DateInput, now: Date): number {
  return Math.max(1, differenceInCalendarDays(now, toDate(value)));
}

export function followUpPillLabel(value: DateInput, state: FollowUpState, now: Date): string {
  const date = toDate(value);
  switch (state) {
    case "overdue":
      return `Overdue · ${overdueDays(date, now)}d`;
    case "today": {
      const late = lateBy(date, now);
      const label = `Today ${formatTime(date)}`;
      return late ? `${label} · ${late} late` : label;
    }
    case "upcoming": {
      const daysAhead = differenceInCalendarDays(date, now);
      if (daysAhead === 1) {
        return `Tomorrow ${formatTime(date)}`;
      }
      if (daysAhead < 7) {
        return `${format(date, "EEE")} ${formatTime(date)}`;
      }
      return `${format(date, "d MMM")} ${formatTime(date)}`;
    }
    case "none":
      return "";
  }
}

export function isLate(value: DateInput, state: FollowUpState, now: Date): boolean {
  return state === "overdue" || (state === "today" && lateBy(value, now) !== null);
}

function atHour(date: Date, hours: number, minutes = 0): Date {
  return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
}

function roundUpToQuarterHour(date: Date): Date {
  return new Date(Math.ceil(date.getTime() / QUARTER_HOUR_MS) * QUARTER_HOUR_MS);
}

export function resolveFollowUpPreset(preset: FollowUpPresetId, now: Date): Date | null {
  switch (preset) {
    case "later_today": {
      const candidate = roundUpToQuarterHour(addHours(now, LATER_TODAY_HOURS));
      return isSameDay(candidate, now) ? candidate : null;
    }
    case "tomorrow":
      return atHour(addDays(now, 1), FOLLOW_UP_HOUR);
    case "two_business_days":
      return atHour(addBusinessDays(now, 2), FOLLOW_UP_HOUR);
    case "next_monday":
      return atHour(nextMonday(now), FOLLOW_UP_HOUR);
  }
}

export function defaultCustomFollowUp(now: Date): { date: string; time: string } {
  const tomorrow = atHour(addDays(now, 1), FOLLOW_UP_HOUR);
  return { date: format(tomorrow, "yyyy-MM-dd"), time: format(tomorrow, "HH:mm") };
}

export function parseLocalDateTime(date: string, time: string): Date | null {
  const parsed = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return isValid(parsed) ? parsed : null;
}
