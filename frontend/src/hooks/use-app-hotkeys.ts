"use client";

import { useHotkeys } from "react-hotkeys-hook";

import { SHORTCUTS } from "@/config/shortcuts";

export type AppHotkeyHandlers = {
  focusSearch: () => void;
  newLead: () => void;
  openCommandPalette: () => void;
  nextLead: () => void;
  previousLead: () => void;
  openSelectedLead: () => void;
  showShortcuts: () => void;
};

function isInteractive(event: KeyboardEvent): boolean {
  return (
    event.target instanceof HTMLElement &&
    event.target.closest("button, a, [role='button']") !== null
  );
}

export function useAppHotkeys(handlers: AppHotkeyHandlers, singleKeysEnabled: boolean): void {
  const singleKey = { enabled: singleKeysEnabled, preventDefault: true };

  useHotkeys(SHORTCUTS.focusSearch.hotkey, handlers.focusSearch, singleKey, [handlers.focusSearch]);
  useHotkeys(SHORTCUTS.newLead.hotkey, handlers.newLead, singleKey, [handlers.newLead]);
  useHotkeys(SHORTCUTS.nextLead.hotkey, handlers.nextLead, singleKey, [handlers.nextLead]);
  useHotkeys(SHORTCUTS.previousLead.hotkey, handlers.previousLead, singleKey, [
    handlers.previousLead,
  ]);
  useHotkeys(SHORTCUTS.showShortcuts.hotkey, handlers.showShortcuts, singleKey, [
    handlers.showShortcuts,
  ]);
  useHotkeys(
    SHORTCUTS.openLead.hotkey,
    handlers.openSelectedLead,
    { enabled: singleKeysEnabled, ignoreEventWhen: isInteractive },
    [handlers.openSelectedLead],
  );
  useHotkeys(
    SHORTCUTS.commandPalette.hotkey,
    handlers.openCommandPalette,
    { enableOnFormTags: true, preventDefault: true },
    [handlers.openCommandPalette],
  );
}
