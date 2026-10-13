import type { LeadStatus } from "@/lib/api/types";

export type StatusTone = {
  badge: string;
  dot: string;
  soft: string;
  solid: string;
  text: string;
};

export type StatusConfig = {
  value: LeadStatus;
  label: string;
  description: string;
  pipelineIndex: number;
  isClosed: boolean;
  tone: StatusTone;
};

export const STATUS_CONFIG: Record<LeadStatus, StatusConfig> = {
  new: {
    value: "new",
    label: "New",
    description: "Just came in. No one has reached out yet.",
    pipelineIndex: 0,
    isClosed: false,
    tone: {
      badge: "bg-status-new-soft text-status-new",
      dot: "bg-status-new",
      soft: "bg-status-new-soft text-status-new",
      solid: "bg-status-new text-background",
      text: "text-status-new",
    },
  },
  contacted: {
    value: "contacted",
    label: "Contacted",
    description: "You've reached out. Waiting for a real conversation.",
    pipelineIndex: 1,
    isClosed: false,
    tone: {
      badge: "bg-status-contacted-soft text-status-contacted",
      dot: "bg-status-contacted",
      soft: "bg-status-contacted-soft text-status-contacted",
      solid: "bg-status-contacted text-background",
      text: "text-status-contacted",
    },
  },
  qualified: {
    value: "qualified",
    label: "Qualified",
    description: "Confirmed need, budget and decision-maker.",
    pipelineIndex: 2,
    isClosed: false,
    tone: {
      badge: "bg-status-qualified-soft text-status-qualified",
      dot: "bg-status-qualified",
      soft: "bg-status-qualified-soft text-status-qualified",
      solid: "bg-status-qualified text-background",
      text: "text-status-qualified",
    },
  },
  proposal_sent: {
    value: "proposal_sent",
    label: "Proposal Sent",
    description: "Pricing or a proposal is with them.",
    pipelineIndex: 3,
    isClosed: false,
    tone: {
      badge: "bg-status-proposal-soft text-status-proposal",
      dot: "bg-status-proposal",
      soft: "bg-status-proposal-soft text-status-proposal",
      solid: "bg-status-proposal text-background",
      text: "text-status-proposal",
    },
  },
  won: {
    value: "won",
    label: "Won",
    description: "Deal closed.",
    pipelineIndex: 4,
    isClosed: true,
    tone: {
      badge: "bg-status-won-soft text-status-won",
      dot: "bg-status-won",
      soft: "bg-status-won-soft text-status-won",
      solid: "bg-status-won text-background",
      text: "text-status-won",
    },
  },
  lost: {
    value: "lost",
    label: "Lost",
    description: "Not moving forward. Notes stay for later.",
    pipelineIndex: 5,
    isClosed: true,
    tone: {
      badge: "bg-status-lost-soft text-status-lost",
      dot: "bg-status-lost",
      soft: "bg-status-lost-soft text-status-lost",
      solid: "bg-status-lost text-background",
      text: "text-status-lost",
    },
  },
};

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
] as const satisfies readonly LeadStatus[];

export const OPEN_STATUSES = LEAD_STATUSES.filter((status) => !STATUS_CONFIG[status].isClosed);
export const CLOSED_STATUSES = LEAD_STATUSES.filter((status) => STATUS_CONFIG[status].isClosed);

export function statusLabel(status: LeadStatus): string {
  return STATUS_CONFIG[status].label;
}

export function isClosedStatus(status: LeadStatus): boolean {
  return STATUS_CONFIG[status].isClosed;
}

export function isLeadStatus(value: string | null | undefined): value is LeadStatus {
  return LEAD_STATUSES.some((status) => status === value);
}
