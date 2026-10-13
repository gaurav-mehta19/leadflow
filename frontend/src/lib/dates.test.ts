import { describe, expect, it } from "vitest";

import {
  dayLabel,
  defaultCustomFollowUp,
  describeWhen,
  followUpPillLabel,
  formatRelative,
  lateBy,
  parseLocalDateTime,
  resolveFollowUpPreset,
  toOffsetIso,
} from "@/lib/dates";

const MONDAY_1PM = new Date(2026, 4, 4, 13, 0);

function at(day: number, hours: number, minutes = 0, month = 4, year = 2026): Date {
  return new Date(year, month, day, hours, minutes);
}

describe("formatRelative", () => {
  it.each([
    [new Date(2026, 4, 4, 12, 59, 30), "just now"],
    [new Date(2026, 4, 4, 13, 0, 30), "just now"],
    [at(4, 12, 55), "5m ago"],
    [at(4, 10, 0), "3h ago"],
    [at(2, 9, 0), "2d ago"],
    [at(20, 9, 0, 3), "2w ago"],
    [at(1, 9, 0, 2), "1 Mar"],
    [at(1, 9, 0, 11, 2025), "1 Dec 2025"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatRelative(value, MONDAY_1PM)).toBe(expected);
  });
});

describe("dayLabel", () => {
  it("names today and yesterday", () => {
    expect(dayLabel(at(4, 0, 5), MONDAY_1PM)).toBe("Today");
    expect(dayLabel(at(3, 23, 59), MONDAY_1PM)).toBe("Yesterday");
  });

  it("uses weekday and date for older days and adds the year when it differs", () => {
    expect(dayLabel(at(1, 10), MONDAY_1PM)).toBe("Fri, 1 May");
    expect(dayLabel(at(30, 10, 0, 11, 2025), MONDAY_1PM)).toBe("Tue, 30 Dec 2025");
  });
});

describe("lateBy", () => {
  it("is null for future times and times on previous days", () => {
    expect(lateBy(at(4, 14), MONDAY_1PM)).toBeNull();
    expect(lateBy(at(3, 18), MONDAY_1PM)).toBeNull();
  });

  it("reports minutes and hours for passed times today", () => {
    expect(lateBy(at(4, 12, 35), MONDAY_1PM)).toBe("25m");
    expect(lateBy(at(4, 10), MONDAY_1PM)).toBe("3h");
  });
});

describe("followUpPillLabel", () => {
  it.each([
    [at(2, 11), "overdue", "Overdue · 2d"],
    [at(4, 14), "today", "Today 2:00 PM"],
    [at(4, 10), "today", "Today 10:00 AM · 3h late"],
    [at(5, 10), "upcoming", "Tomorrow 10:00 AM"],
    [at(8, 10), "upcoming", "Fri 10:00 AM"],
    [at(20, 11, 30), "upcoming", "20 May 11:30 AM"],
    [at(20, 11, 30), "none", ""],
  ] as const)("labels %s in state %s as %s", (value, state, expected) => {
    expect(followUpPillLabel(value, state, MONDAY_1PM)).toBe(expected);
  });
});

describe("describeWhen", () => {
  it.each([
    [at(4, 14), "Today, 2:00 PM"],
    [at(5, 10), "Tomorrow, 10:00 AM"],
    [at(3, 9, 30), "Yesterday, 9:30 AM"],
    [at(8, 10), "Fri, 10:00 AM"],
    [at(20, 11, 30), "Wed, 20 May, 11:30 AM"],
  ])("describes %s as %s", (value, expected) => {
    expect(describeWhen(value, MONDAY_1PM)).toBe(expected);
  });
});

describe("resolveFollowUpPreset", () => {
  it("later today adds three hours and rounds up to the next quarter hour", () => {
    expect(resolveFollowUpPreset("later_today", at(4, 10, 7))).toEqual(at(4, 13, 15));
    expect(resolveFollowUpPreset("later_today", at(4, 10, 0))).toEqual(at(4, 13, 0));
  });

  it("later today is unavailable when it would cross midnight", () => {
    expect(resolveFollowUpPreset("later_today", at(4, 20, 40))).toEqual(at(4, 23, 45));
    expect(resolveFollowUpPreset("later_today", at(4, 20, 50))).toBeNull();
    expect(resolveFollowUpPreset("later_today", at(4, 21, 0))).toBeNull();
    expect(resolveFollowUpPreset("later_today", at(4, 22, 30))).toBeNull();
  });

  it("tomorrow is 10 AM the next day", () => {
    expect(resolveFollowUpPreset("tomorrow", at(4, 23, 30))).toEqual(at(5, 10));
  });

  it.each([
    ["Monday", at(4, 13), at(6, 10)],
    ["Thursday", at(7, 13), at(11, 10)],
    ["Friday", at(8, 13), at(12, 10)],
    ["Saturday", at(9, 13), at(12, 10)],
  ])("two business days from %s skips weekends", (_day, from, expected) => {
    expect(resolveFollowUpPreset("two_business_days", from)).toEqual(expected);
  });

  it("next Monday is always in the future at 10 AM", () => {
    expect(resolveFollowUpPreset("next_monday", at(4, 8))).toEqual(at(11, 10));
    expect(resolveFollowUpPreset("next_monday", at(10, 20))).toEqual(at(11, 10));
  });
});

describe("custom follow-up helpers", () => {
  it("defaults to tomorrow at 10:00", () => {
    expect(defaultCustomFollowUp(MONDAY_1PM)).toEqual({ date: "2026-05-05", time: "10:00" });
  });

  it("parses local date and time inputs", () => {
    expect(parseLocalDateTime("2026-05-05", "10:30")).toEqual(at(5, 10, 30));
    expect(parseLocalDateTime("2026-05-05", "")).toBeNull();
    expect(parseLocalDateTime("not-a-date", "10:30")).toBeNull();
  });

  it("serialises with the local UTC offset", () => {
    expect(toOffsetIso(at(5, 10))).toBe("2026-05-05T10:00:00+05:30");
  });
});
