"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, Logo, type IconName } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { useSettings } from "@/lib/settings";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/users", label: "Users", icon: "users" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar({ onNavigate, onSearch }: { onNavigate?: () => void; onSearch?: () => void }) {
  const pathname = usePathname();
  const { profile } = useSettings();

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 rounded-md px-1.5 py-1">
        <Logo className="size-8" />
        <span className="font-display text-[19px] font-semibold tracking-tight">Marlow</span>
        <span className="ml-auto rounded-md border border-line px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-ink-3">Admin</span>
      </Link>

      <button
        type="button"
        onClick={onSearch}
        className="mt-6 flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-2.5 text-[13px] text-ink-3 transition-colors hover:text-ink-2"
      >
        <Icon name="search" className="size-3.5" />
        Search
        <kbd className="ml-auto font-mono text-[10px]">⌘K</kbd>
      </button>

      <nav aria-label="Main" className="mt-7">
        <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Workspace</p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active ? "bg-panel font-medium text-ink shadow-[var(--shadow)] ring-1 ring-line" : "text-ink-2 hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  {active && <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" aria-hidden="true" />}
                  <Icon name={item.icon} className={cx("size-[17px]", active ? "text-accent-fg" : "text-ink-3")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-line bg-panel p-3">
          <p className="flex items-center gap-2 text-xs font-medium">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            Business plan
          </p>
          <p className="mt-1.5 text-xs text-ink-3">Renews Dec 8 · 13 days left</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <div className="h-full w-[57%] rounded-full bg-accent" />
          </div>
        </div>
        <Link href="/settings" onClick={onNavigate} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-ink/5">
          <Avatar name={profile.name} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{profile.name}</span>
            <span className="block truncate text-xs text-ink-3">{profile.title || profile.email}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
