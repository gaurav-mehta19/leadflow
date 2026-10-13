"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useCallback } from "react";

export function useLeadParam() {
  const [leadId, setLeadId] = useQueryState("lead", parseAsString);

  const openLead = useCallback((id: string) => setLeadId(id, { history: "push" }), [setLeadId]);
  const closeLead = useCallback(() => setLeadId(null, { history: "replace" }), [setLeadId]);

  return { leadId, openLead, closeLead };
}
