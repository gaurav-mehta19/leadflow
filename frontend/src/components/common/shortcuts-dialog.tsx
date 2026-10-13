"use client";

import { KeyCombo } from "@/components/common/kbd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COPY } from "@/config/copy";
import { SHORTCUT_ORDER, SHORTCUTS } from "@/config/shortcuts";

type ShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COPY.actions.keyboardShortcuts}</DialogTitle>
          <DialogDescription>
            Single-key shortcuts pause while you type in a field.
          </DialogDescription>
        </DialogHeader>
        <dl className="-mx-1 divide-y divide-border">
          {SHORTCUT_ORDER.map((id) => {
            const shortcut = SHORTCUTS[id];
            return (
              <div key={id} className="flex items-center justify-between gap-4 px-1 py-2.5">
                <dt className="text-sm">{shortcut.description}</dt>
                <dd>
                  <KeyCombo keys={shortcut.keys} />
                </dd>
              </div>
            );
          })}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
