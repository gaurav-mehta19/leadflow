"use client";

import { useCallback, useRef, useState } from "react";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function useListNavigation(ids: readonly string[]) {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const selectedId = selected !== null && ids.includes(selected) ? selected : null;

  const registerRow = useCallback(
    (id: string) => (element: HTMLLIElement | null) => {
      if (element) {
        rows.current.set(id, element);
      } else {
        rows.current.delete(id);
      }
    },
    [],
  );

  const move = useCallback(
    (step: 1 | -1) => {
      if (ids.length === 0) {
        return;
      }
      const index = selectedId === null ? -1 : ids.indexOf(selectedId);
      const nextIndex =
        index === -1
          ? step === 1
            ? 0
            : ids.length - 1
          : Math.min(ids.length - 1, Math.max(0, index + step));
      const nextId = ids[nextIndex];
      if (nextId === undefined) {
        return;
      }
      setSelected(nextId);
      rows.current.get(nextId)?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    },
    [ids, selectedId],
  );

  const selectNext = useCallback(() => move(1), [move]);
  const selectPrevious = useCallback(() => move(-1), [move]);
  const select = useCallback((id: string | null) => setSelected(id), []);

  return { selectedId, registerRow, selectNext, selectPrevious, select };
}
