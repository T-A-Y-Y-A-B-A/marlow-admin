"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";
import { usersApi } from "@/lib/api";
import { sendCommand, type Command } from "@/lib/commands";
import { cx } from "@/lib/cx";
import { toggleTheme } from "@/lib/settings";
import { fold, type User } from "@/lib/users";

type Item = { id: string; group: "Pages" | "Actions" | "People"; label: string; hint?: string; icon?: IconName; person?: string; run: () => void };

/** ⌘K command bar: jump to a page, run an action, or find a person. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [people, setPeople] = useState<User[]>([]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      usersApi.list().then(setPeople);
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    setQ("");
    setActive(0);
    onClose();
  };
  const go = (href: string, command?: Command) => () => {
    close();
    router.push(href);
    if (command) sendCommand(command);
  };

  const actions: Item[] = [
    { id: "overview", group: "Pages", label: "Overview", hint: "Revenue, regions, activity", icon: "overview", run: go("/") },
    { id: "users", group: "Pages", label: "Users", hint: "Search, filter, edit", icon: "users", run: go("/users") },
    { id: "settings", group: "Pages", label: "Settings", hint: "Profile, theme, notifications", icon: "settings", run: go("/settings") },
    { id: "new-user", group: "Actions", label: "Add a user", icon: "plus", run: go("/users", { type: "new-user" }) },
    {
      id: "theme",
      group: "Actions",
      label: "Toggle dark mode",
      icon: "moon",
      run: () => {
        close();
        toggleTheme();
      },
    },
    { id: "profile", group: "Actions", label: "Edit your profile", icon: "pencil", run: go("/settings") },
  ];

  const query = fold(q.trim());
  const items: Item[] = [
    ...actions.filter((a) => !query || fold(a.label).includes(query)),
    ...(query
      ? people
          .filter((u) => fold(u.name).includes(query) || u.email.includes(query))
          .slice(0, 6)
          .map((u): Item => ({ id: u.id, group: "People", label: u.name, hint: u.email, person: u.name, run: go("/users", { type: "search-users", q: u.email }) }))
      : []),
  ];
  const current = Math.min(active, items.length - 1);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[current]?.run();
    }
  };

  return (
    <dialog
      ref={ref}
      aria-label="Command bar"
      onClose={close}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="dialog mx-auto mb-auto mt-[12vh] w-[min(620px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-[rgb(5_6_5/0.55)] backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Icon name="search" className="size-4 text-ink-3" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              placeholder="Jump to a page, run an action, find a person…"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-list"
              aria-activedescendant={items[current] ? `cmd-${items[current].id}` : undefined}
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
            />
            <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-3">esc</kbd>
          </div>

          <ul id="command-list" role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
            {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-3">Nothing matches “{q}”.</li>}
            {items.map((item, i) => (
              <li key={item.id} role="presentation">
                {(i === 0 || items[i - 1].group !== item.group) && (
                  <p className="px-3 pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{item.group}</p>
                )}
                <div
                  id={`cmd-${item.id}`}
                  role="option"
                  aria-selected={i === current}
                  onMouseMove={() => i !== current && setActive(i)}
                  onClick={item.run}
                  className={cx(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                    i === current ? "bg-accent text-accent-ink" : "text-ink",
                  )}
                >
                  {item.person ? (
                    <Avatar name={item.person} className="size-6 text-[10px]" />
                  ) : (
                    <Icon name={item.icon ?? "arrowRight"} className={cx("size-4", i === current ? "text-accent-ink" : "text-ink-3")} />
                  )}
                  <span className="font-medium">{item.label}</span>
                  {item.hint && <span className={cx("truncate text-xs", i === current ? "text-accent-ink/70" : "text-ink-3")}>{item.hint}</span>}
                  {i === current && <Icon name="enter" className="ml-auto size-3.5 shrink-0" />}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 font-mono text-[10px] text-ink-3">
            <span>↑↓ move</span>
            <span>↵ open</span>
            <span className="ml-auto">Tip: type a name to find a person</span>
          </div>
        </>
      )}
    </dialog>
  );
}
