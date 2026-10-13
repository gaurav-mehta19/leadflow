import type { FollowUpPresetId } from "@/lib/dates";

export type FollowUpChoice = FollowUpPresetId | "custom";

export type FollowUpPresetOption = {
  id: FollowUpChoice;
  label: string;
};

export const FOLLOW_UP_PRESETS: readonly FollowUpPresetOption[] = [
  { id: "later_today", label: "Later today" },
  { id: "tomorrow", label: "Tomorrow 10 AM" },
  { id: "two_business_days", label: "In 2 business days" },
  { id: "next_monday", label: "Next Monday" },
  { id: "custom", label: "Custom" },
];

export const DEFAULT_FOLLOW_UP_CHOICE: FollowUpChoice = "tomorrow";
