"use client";

import { useMemo, useSyncExternalStore } from "react";

import { TIMING } from "@/config/limits";

const listeners = new Set<() => void>();
let currentTime = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;

function tick(): void {
  currentTime = Date.now();
  for (const listener of listeners) {
    listener();
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    tick();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    currentTime = Date.now();
    timer = setInterval(tick, TIMING.nowTickMs);
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

function getSnapshot(): number {
  return currentTime;
}

function getServerSnapshot(): number {
  return 0;
}

export function useNow(): Date {
  const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => new Date(time), [time]);
}

export function refreshNow(): void {
  tick();
}
