import { useSyncExternalStore } from "react";

export type Mode = "shop" | "worker";
const KEY = "pk-mode";
const subs = new Set<() => void>();

function read(): Mode {
  if (typeof window === "undefined") return "shop";
  return localStorage.getItem(KEY) === "worker" ? "worker" : "shop";
}

export function setMode(m: Mode) {
  localStorage.setItem(KEY, m);
  subs.forEach((f) => f());
}

export function useMode(): Mode {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    read,
    () => "shop",
  );
}
