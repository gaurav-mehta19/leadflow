import type { components } from "@/lib/api/schema";

type Schemas = components["schemas"];

export type Lead = Schemas["LeadRead"];
export type LeadPage = Schemas["LeadPage"];
export type LeadStatus = Schemas["LeadStatus"];
export type LeadStats = Schemas["LeadStatsRead"];
export type FollowUps = Schemas["FollowUpsRead"];
export type FollowUpState = Schemas["FollowUpState"];
export type LeadCreateInput = Schemas["LeadCreate"];
export type LeadUpdateInput = Schemas["LeadUpdate"];
export type Activity = Schemas["ActivityRead"];
export type ActivityKind = Schemas["ActivityKind"];
export type ActivityPage = Schemas["ActivityPage"];
export type NoteCreateInput = Schemas["NoteCreate"];
export type NoteCreated = Schemas["NoteCreatedRead"];
export type Problem = Schemas["Problem"];
