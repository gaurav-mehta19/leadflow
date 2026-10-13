"use client";

import { useRef } from "react";

type AutoFocusHandler = (event: Event) => void;

type ReturnFocusHandlers = {
  onOpenAutoFocus: AutoFocusHandler;
  onCloseAutoFocus: AutoFocusHandler;
};

export function useReturnFocus(
  onOpenAutoFocus: AutoFocusHandler | undefined,
  onCloseAutoFocus: AutoFocusHandler | undefined,
): ReturnFocusHandlers {
  const opener = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: (event) => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event) => {
      onCloseAutoFocus?.(event);
      const target = opener.current;
      opener.current = null;
      if (!event.defaultPrevented && target?.isConnected && target !== document.body) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
