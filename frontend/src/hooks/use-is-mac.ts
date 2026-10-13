"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => undefined;
}

function detectMac(): boolean {
  return /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function useIsMac(): boolean {
  return useSyncExternalStore(subscribe, detectMac, () => false);
}
