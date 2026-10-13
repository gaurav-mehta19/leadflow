"use client";

import { useCallback, useState } from "react";

import { safeStorage } from "@/lib/safe-storage";

const DRAFT_PREFIX = "leadflow:draft:";

export function useLocalDraft(draftKey: string): {
  draft: string;
  setDraft: (value: string) => void;
  clearDraft: () => void;
} {
  const storageKey = `${DRAFT_PREFIX}${draftKey}`;
  const [draft, setDraftState] = useState(() => safeStorage.get(storageKey) ?? "");

  const setDraft = useCallback(
    (value: string) => {
      setDraftState(value);
      if (value.trim()) {
        safeStorage.set(storageKey, value);
      } else {
        safeStorage.remove(storageKey);
      }
    },
    [storageKey],
  );

  const clearDraft = useCallback(() => {
    setDraftState("");
    safeStorage.remove(storageKey);
  }, [storageKey]);

  return { draft, setDraft, clearDraft };
}
