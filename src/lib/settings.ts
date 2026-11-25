// Account settings: a tiny localStorage-backed store read through useSyncExternalStore,
// so every component (sidebar, top bar, settings page) stays in sync without a provider.
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

export interface Profile {
  name: string;
  email: string;
  title: string;
  timezone: string;
  bio: string;
}

export interface Settings {
  profile: Profile;
  theme: Theme;
  reduceMotion: boolean;
  notify: { digest: boolean; signups: boolean; failedPayments: boolean; productNews: boolean };
}

export const STORAGE_KEY = "marlow:settings:v1";

export const DEFAULT_SETTINGS: Settings = {
  profile: {
    name: "Maya Okafor",
    email: "maya@marlow.app",
    title: "Head of Operations",
    timezone: "Europe/London",
    bio: "Runs billing and customer operations. Ask me about refunds, plan changes and anything invoice-shaped.",
  },
  theme: "dark",
  reduceMotion: false,
  notify: { digest: true, signups: true, failedPayments: true, productNews: false },
};

const listeners = new Set<() => void>();
let current: Settings | null = null;

export function getSettings(): Settings {
  if (current) return current;
  let stored: Partial<Settings> = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    // corrupted or blocked storage: use defaults
  }
  current = { ...DEFAULT_SETTINGS, ...stored };
  return current;
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // keep in memory only
  }
  emit();
}

/** Flip between light and dark, based on what's on screen right now (covers "system"). */
export function toggleTheme() {
  updateSettings({ theme: document.documentElement.dataset.theme === "dark" ? "light" : "dark" });
}

export function resetSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing stored
  }
  current = null;
  emit();
}

export function subscribeSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const useSettings = () => useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULT_SETTINGS);
