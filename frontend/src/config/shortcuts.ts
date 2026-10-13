export type ShortcutId =
  | "focusSearch"
  | "newLead"
  | "commandPalette"
  | "nextLead"
  | "previousLead"
  | "openLead"
  | "closeDialog"
  | "logNote"
  | "showShortcuts";

export type Shortcut = {
  id: ShortcutId;
  hotkey: string;
  keys: readonly string[];
  description: string;
};

export const SHORTCUTS: Record<ShortcutId, Shortcut> = {
  focusSearch: { id: "focusSearch", hotkey: "slash", keys: ["/"], description: "Focus search" },
  newLead: { id: "newLead", hotkey: "n", keys: ["N"], description: "New lead" },
  commandPalette: {
    id: "commandPalette",
    hotkey: "mod+k",
    keys: ["mod", "K"],
    description: "Open command palette",
  },
  nextLead: { id: "nextLead", hotkey: "j", keys: ["J"], description: "Next lead" },
  previousLead: { id: "previousLead", hotkey: "k", keys: ["K"], description: "Previous lead" },
  openLead: { id: "openLead", hotkey: "enter", keys: ["Enter"], description: "Open selected lead" },
  closeDialog: { id: "closeDialog", hotkey: "escape", keys: ["Esc"], description: "Close dialog" },
  logNote: { id: "logNote", hotkey: "mod+enter", keys: ["mod", "Enter"], description: "Log note" },
  showShortcuts: {
    id: "showShortcuts",
    hotkey: "shift+slash",
    keys: ["?"],
    description: "Show keyboard shortcuts",
  },
};

export const SHORTCUT_ORDER: readonly ShortcutId[] = [
  "focusSearch",
  "newLead",
  "commandPalette",
  "nextLead",
  "previousLead",
  "openLead",
  "closeDialog",
  "logNote",
  "showShortcuts",
];
