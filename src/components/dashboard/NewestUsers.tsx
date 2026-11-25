"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PlanBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { usersApi } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { User } from "@/lib/users";

export function NewestUsers({ className }: { className?: string }) {
  const [users, setUsers] = useState<User[] | null>(null);

  useEffect(() => {
    let live = true;
    usersApi.list().then((all) => {
      if (live) setUsers([...all].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5));
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Card
      className={className}
      title="Newest users"
      subtitle="Most recent sign-ups and invites"
      action={
        <Link href="/users" className="text-xs font-medium text-accent-fg hover:underline">
          View all
        </Link>
      }
    >
      <ul className="divide-y divide-line px-5 pb-2 pt-2">
        {users === null
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className="size-8 animate-pulse rounded-full bg-ink/[0.07]" />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-3 w-28 animate-pulse rounded bg-ink/[0.07]" />
                  <span className="block h-2.5 w-40 animate-pulse rounded bg-ink/[0.05]" />
                </span>
              </li>
            ))
          : users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-ink-3">{u.email}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <PlanBadge plan={u.plan} />
                  <span className="text-[11px] text-ink-3">{timeAgo(u.createdAt)}</span>
                </div>
              </li>
            ))}
      </ul>
    </Card>
  );
}
