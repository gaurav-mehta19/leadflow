import { describe, expect, it } from "vitest";

import { avatarTone, initials } from "@/lib/avatar";

describe("initials", () => {
  it.each([
    ["Ananya Iyer", "AI"],
    ["  vikram   rao ", "VR"],
    ["Meera Devi Nair", "MN"],
    ["Cher", "C"],
    ["", "?"],
  ])("derives %s as %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe("avatarTone", () => {
  it("is stable for the same name regardless of case and spacing", () => {
    expect(avatarTone("Ananya Iyer")).toBe(avatarTone("  ananya iyer "));
  });

  it("always returns one of the six avatar tokens", () => {
    for (const name of ["A", "Rohan Mehta", "Priya Sharma", "Daniel Okafor", "Sara Lindqvist"]) {
      expect(avatarTone(name)).toMatch(/^bg-avatar-[1-6] text-avatar-foreground$/);
    }
  });
});
