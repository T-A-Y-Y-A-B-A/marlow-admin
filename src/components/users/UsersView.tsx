"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PlanBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { inputClass, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { ApiError, usersApi } from "@/lib/api";
import { cx } from "@/lib/cx";
import { fullDate, timeAgo } from "@/lib/format";
import {
  countByStatus,
  DEFAULT_QUERY,
  deleteBlocker,
  paginate,
  PLANS,
  queryUsers,
  ROLES,
  STATUSES,
  type SortKey,
  type User,
  type UserInput,
  type UserQuery,
} from "@/lib/users";
import { UserForm } from "./UserForm";

const PAGE_SIZE = 10;

function SortHeader({ label, sortKey, query, onSort, className }: { label: string; sortKey: SortKey; query: UserQuery; onSort: (k: SortKey) => void; className?: string }) {
  const active = query.sort === sortKey;
  return (
    <th scope="col" aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"} className={cx("px-4 py-2.5 font-medium", className)}>
      <button type="button" onClick={() => onSort(sortKey)} className={cx("inline-flex items-center gap-1 hover:text-ink", active && "text-ink")}>
        {label}
        <Icon name={active ? (query.dir === "asc" ? "arrowUp" : "arrowDown") : "sort"} className={cx("size-3.5", !active && "opacity-40")} />
      </button>
    </th>
  );
}

function RowActions({ user, onEdit, onDelete }: { user: User; onEdit: (u: User) => void; onDelete: (u: User) => void }) {
  return (
    <div className="flex justify-end gap-0.5">
      <button type="button" onClick={() => onEdit(user)} aria-label={`Edit ${user.name}`} className="rounded-md p-1.5 text-ink-3 hover:bg-ink/5 hover:text-ink">
        <Icon name="pencil" />
      </button>
      <button type="button" onClick={() => onDelete(user)} aria-label={`Delete ${user.name}`} className="rounded-md p-1.5 text-ink-3 hover:bg-neg-soft hover:text-neg">
        <Icon name="trash" />
      </button>
    </div>
  );
}

export function UsersView() {
  const toast = useToast();
  const [users, setUsers] = useState<User[] | null>(null);
  const [query, setQuery] = useState<UserQuery>(DEFAULT_QUERY);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [removing, setRemoving] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    usersApi.list().then((list) => live && setUsers(list));
    return () => {
      live = false;
    };
  }, []);

  // "/" jumps to search, like most admin tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !el.closest("input, textarea, select, [contenteditable], dialog")) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const all = useMemo(() => users ?? [], [users]);
  const results = useMemo(() => queryUsers(all, query), [all, query]);
  const counts = useMemo(() => countByStatus(all), [all]);
  const { rows, page: current, pages } = paginate(results, page, PAGE_SIZE);
  const filtered = query.q !== "" || query.role !== "all" || query.plan !== "all" || query.status !== "all";
  const first = results.length ? (current - 1) * PAGE_SIZE + 1 : 0;

  const update = (patch: Partial<UserQuery>) => {
    setQuery((q) => ({ ...q, ...patch }));
    setPage(1);
  };
  const sortBy = (key: SortKey) =>
    update({ sort: key, dir: query.sort === key ? (query.dir === "asc" ? "desc" : "asc") : key === "name" || key === "role" ? "asc" : "desc" });

  async function save(input: UserInput) {
    if (editing === "new") {
      const user = await usersApi.create(input);
      const next = [user, ...all];
      setUsers(next);
      // Jump to the page holding the new row (stays put if current filters hide it).
      const index = queryUsers(next, query).findIndex((u) => u.id === user.id);
      if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1);
      toast(`${user.name} was added.`);
    } else if (editing) {
      const user = await usersApi.update(editing.id, input);
      setUsers((list) => (list ?? []).map((u) => (u.id === user.id ? user : u)));
      toast("Changes saved.");
    }
    setEditing(null);
  }

  async function remove() {
    if (!deleting) return;
    setRemoving(true);
    try {
      await usersApi.remove(deleting.id);
      setUsers((list) => (list ?? []).filter((u) => u.id !== deleting.id));
      toast(`${deleting.name} was removed.`);
      setDeleting(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn’t delete this user. Try again.", "error");
    } finally {
      setRemoving(false);
    }
  }

  const blocker = deleting ? deleteBlocker(deleting, all) : null;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Users"
        description={users ? `${counts.all} people with access to Marlow workspaces.` : "Loading people…"}
        actions={
          <Button variant="primary" onClick={() => setEditing("new")} disabled={!users}>
            <Icon name="plus" />
            Add user
          </Button>
        }
      />

      <div className="enter overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow)]" style={{ "--i": 1 } as CSSProperties}>
        {/* Status filter */}
        <div role="group" aria-label="Filter by status" className="flex gap-4 overflow-x-auto border-b border-line px-4 sm:gap-5">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={query.status === s}
              onClick={() => update({ status: s })}
              className={cx(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-sm transition-colors",
                query.status === s ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {s === "all" ? "All" : s}
              <span className="tnum rounded-full bg-ink/[0.06] px-1.5 text-[11px] text-ink-2">{users ? counts[s] : "–"}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input
              ref={search}
              type="search"
              value={query.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Search name or email"
              aria-label="Search users"
              className={cx(inputClass, "pl-8 pr-8")}
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[10px] text-ink-3 sm:block">/</kbd>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select aria-label="Filter by role" value={query.role} onChange={(e) => update({ role: e.target.value as UserQuery["role"] })} className="sm:w-36">
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
            <Select aria-label="Filter by plan" value={query.plan} onChange={(e) => update({ plan: e.target.value as UserQuery["plan"] })} className="sm:w-36">
              <option value="all">All plans</option>
              {PLANS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </div>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => update({ q: "", role: "all", plan: "all", status: "all" })} className="self-start sm:self-auto">
              <Icon name="x" className="size-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        {users === null ? (
          <div aria-busy="true" aria-label="Loading users" className="divide-y divide-line">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <span className="size-8 animate-pulse rounded-full bg-ink/[0.07]" />
                <span className="h-3 w-40 animate-pulse rounded bg-ink/[0.07]" />
                <span className="ml-auto h-3 w-16 animate-pulse rounded bg-ink/[0.05]" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium">No users match these filters</p>
            <p className="mt-1 text-sm text-ink-2">Try a different search, or clear the filters to see everyone.</p>
            <Button className="mt-4" onClick={() => update({ q: "", role: "all", plan: "all", status: "all" })}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-panel-2 text-left text-xs text-ink-2">
                <tr>
                  <SortHeader label="Name" sortKey="name" query={query} onSort={sortBy} />
                  <SortHeader label="Role" sortKey="role" query={query} onSort={sortBy} />
                  <th scope="col" className="px-4 py-2.5 font-medium">Plan</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <SortHeader label="Joined" sortKey="createdAt" query={query} onSort={sortBy} className="hidden lg:table-cell" />
                  <SortHeader label="Last active" sortKey="lastActiveAt" query={query} onSort={sortBy} className="hidden xl:table-cell" />
                  <th scope="col" className="px-4 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-panel-2">
                    <td className="w-[40%] max-w-0 px-4 py-3 xl:w-[32%]">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-ink-3">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{u.role}</td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={u.plan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="tnum hidden whitespace-nowrap px-4 py-3 text-ink-2 lg:table-cell">{fullDate(u.createdAt)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-2 xl:table-cell">{u.lastActiveAt ? timeAgo(u.lastActiveAt) : <span className="text-ink-3">Never</span>}</td>
                    <td className="px-3 py-3">
                      <RowActions user={u} onEdit={setEditing} onDelete={setDeleting} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((u) => (
                <li key={u.id} className="flex items-start gap-3 px-4 py-3.5">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-ink-3">{u.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                      <StatusBadge status={u.status} />
                      <PlanBadge plan={u.plan} />
                      <span className="ml-1">{u.role}</span>
                    </div>
                  </div>
                  <RowActions user={u} onEdit={setEditing} onDelete={setDeleting} />
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-2">
              <p className="tnum">
                {first}–{first + rows.length - 1} of {results.length}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="tnum mr-2 hidden text-xs text-ink-3 sm:inline">
                  Page {current} of {pages}
                </span>
                <Button size="icon" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  <Icon name="chevronLeft" />
                </Button>
                <Button size="icon" aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  <Icon name="chevronRight" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add user" : "Edit user"}
        description={editing === "new" ? "Give someone access to a Marlow workspace." : editing ? `Update ${editing.name}’s access and plan.` : undefined}
      >
        <UserForm user={editing === "new" ? null : editing} users={all} onSubmit={save} onCancel={() => setEditing(null)} />
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => !removing && setDeleting(null)}
        title={blocker ? "Can’t remove this user" : `Remove ${deleting?.name ?? "user"}?`}
        description={blocker ?? "They’ll lose access to every workspace immediately. This can’t be undone."}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => setDeleting(null)} disabled={removing}>
            {blocker ? "Close" : "Cancel"}
          </Button>
          {!blocker && (
            <Button variant="danger" onClick={remove} disabled={removing}>
              {removing ? "Removing…" : "Remove user"}
            </Button>
          )}
        </div>
      </Dialog>
    </>
  );
}
