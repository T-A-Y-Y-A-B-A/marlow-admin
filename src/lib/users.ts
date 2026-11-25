// Pure user-domain logic. No React, no browser APIs — shared by the UI, the mock API and the tests.

export const ROLES = ["Owner", "Admin", "Editor", "Viewer"] as const;
export const PLANS = ["Free", "Pro", "Business"] as const;
export const STATUSES = ["Active", "Invited", "Suspended"] as const;

export type Role = (typeof ROLES)[number];
export type Plan = (typeof PLANS)[number];
export type Status = (typeof STATUSES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  plan: Plan;
  status: Status;
  createdAt: string;
  lastActiveAt: string | null;
}

export type UserInput = Pick<User, "name" | "email" | "role" | "plan" | "status">;
export type UserErrors = Partial<Record<keyof UserInput, string>>;

export type SortKey = "name" | "role" | "createdAt" | "lastActiveAt";

export interface UserQuery {
  q: string;
  role: Role | "all";
  plan: Plan | "all";
  status: Status | "all";
  sort: SortKey;
  dir: "asc" | "desc";
}

export const DEFAULT_QUERY: UserQuery = {
  q: "",
  role: "all",
  plan: "all",
  status: "all",
  sort: "createdAt",
  dir: "desc",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lowercase and strip accents so "tomas" finds "Tomás". */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function compare(a: User, b: User, key: SortKey): number {
  if (key === "name") return a.name.localeCompare(b.name);
  if (key === "role") return ROLES.indexOf(a.role) - ROLES.indexOf(b.role);
  const x = a[key] ?? "";
  const y = b[key] ?? "";
  return x < y ? -1 : x > y ? 1 : 0;
}

export function queryUsers(users: User[], query: UserQuery): User[] {
  const q = fold(query.q.trim());
  const dir = query.dir === "asc" ? 1 : -1;
  return users
    .filter(
      (u) =>
        (!q || fold(u.name).includes(q) || u.email.toLowerCase().includes(q)) &&
        (query.role === "all" || u.role === query.role) &&
        (query.plan === "all" || u.plan === query.plan) &&
        (query.status === "all" || u.status === query.status),
    )
    .sort((a, b) => compare(a, b, query.sort) * dir || a.name.localeCompare(b.name));
}

export function countByStatus(users: User[]): Record<Status | "all", number> {
  const counts = { all: users.length, Active: 0, Invited: 0, Suspended: 0 };
  for (const u of users) counts[u.status]++;
  return counts;
}

export function cleanInput(input: UserInput): UserInput {
  return { ...input, name: input.name.trim().replace(/\s+/g, " "), email: input.email.trim().toLowerCase() };
}

const ownerCount = (users: User[]) => users.filter((u) => u.role === "Owner").length;

/** Returns field errors; an empty object means the input is valid. `id` is set when editing. */
export function validateUser(input: UserInput, users: User[], id?: string): UserErrors {
  const errors: UserErrors = {};
  const { name, email } = cleanInput(input);

  if (name.length < 2) errors.name = "Enter a name with at least 2 characters.";
  else if (name.length > 80) errors.name = "Keep the name under 80 characters.";

  if (!EMAIL.test(email)) errors.email = "Enter a valid email address.";
  else if (users.some((u) => u.id !== id && u.email.toLowerCase() === email)) errors.email = "Someone already uses this email.";

  if (!ROLES.includes(input.role)) errors.role = "Pick a role.";
  if (!PLANS.includes(input.plan)) errors.plan = "Pick a plan.";
  if (!STATUSES.includes(input.status)) errors.status = "Pick a status.";

  const current = users.find((u) => u.id === id);
  if (current?.role === "Owner" && input.role !== "Owner" && ownerCount(users) === 1) {
    errors.role = "This is the only owner. Make someone else an owner first.";
  }
  return errors;
}

/** Why a user can't be deleted, or null if they can. */
export function deleteBlocker(user: User, users: User[]): string | null {
  return user.role === "Owner" && ownerCount(users) === 1
    ? `${user.name} is the only owner of this workspace. Make someone else an owner before removing them.`
    : null;
}

export function paginate<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { rows: items.slice((current - 1) * size, current * size), page: current, pages };
}
