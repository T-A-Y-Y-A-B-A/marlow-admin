"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { ToastProvider } from "@/components/ui/Toast";
import { getSettings, subscribeSettings, toggleTheme, useSettings } from "@/lib/settings";
import { Sidebar } from "./Sidebar";

const TITLES: Record<string, string> = { "/": "Overview", "/users": "Users", "/settings": "Settings" };

/** Applies theme + motion preferences to <html>. Reads the store directly to avoid a flash during hydration. */
function useApplyPreferences() {
  useEffect(() => {
    const root = document.documentElement;
    const dark = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const { theme, reduceMotion } = getSettings();
      root.dataset.theme = theme === "system" ? (dark.matches ? "dark" : "light") : theme;
      if (reduceMotion) root.dataset.motion = "reduce";
      else delete root.dataset.motion;
    };
    apply();
    const unsubscribe = subscribeSettings(apply);
    dark.addEventListener("change", apply);
    return () => {
      unsubscribe();
      dark.removeEventListener("change", apply);
    };
  }, []);
}

export function AppShell({ children }: { children: ReactNode }) {
  const drawer = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const { profile } = useSettings();
  useApplyPreferences();

  const closeDrawer = () => drawer.current?.close();

  return (
    <ToastProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-panel focus:px-3 focus:py-2 focus:text-sm">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-bg lg:block">
        <Sidebar />
      </aside>

      <dialog
        ref={drawer}
        aria-label="Navigation"
        tabIndex={-1}
        onClick={(e) => e.target === e.currentTarget && closeDrawer()}
        className="drawer m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-line bg-bg p-0 text-ink outline-none backdrop:bg-[rgb(5_6_5/0.55)] lg:hidden"
      >
        <Sidebar onNavigate={closeDrawer} />
      </dialog>

      <div className="paper min-h-dvh lg:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => {
              drawer.current?.showModal();
              drawer.current?.focus(); // focus the panel, not the first link, so no stray ring on open
            }}
            aria-label="Open navigation"
            className="-ml-1.5 rounded-md p-1.5 text-ink-2 hover:bg-ink/5 hover:text-ink lg:hidden"
          >
            <Icon name="menu" className="size-5" />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
            <span className="text-ink-3">Marlow</span>
            <span className="text-ink-3">/</span>
            <span className="truncate font-medium">{TITLES[pathname] ?? "Not found"}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={toggleTheme} aria-label="Toggle dark mode" className="rounded-md p-2 text-ink-2 hover:bg-ink/5 hover:text-ink">
              <Icon name="moon" className="size-[18px] dark:hidden" />
              <Icon name="sun" className="hidden size-[18px] dark:block" />
            </button>
            <Link href="/settings" aria-label="Your profile" className="rounded-full p-0.5 hover:ring-2 hover:ring-line">
              <Avatar name={profile.name} className="size-7 text-[11px]" />
            </Link>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1360px] px-4 pb-20 pt-7 sm:px-6 lg:px-10 lg:pt-9">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
