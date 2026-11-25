import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_QUERY, deleteBlocker, paginate, queryUsers, validateUser, type User } from "./users.ts";

const user = (over: Partial<User>): User => ({
  id: "x",
  name: "Test User",
  email: "test@example.com",
  role: "Viewer",
  plan: "Free",
  status: "Active",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastActiveAt: null,
  ...over,
});

const users = [
  user({ id: "1", name: "Maya Okafor", email: "maya@marlow.app", role: "Owner", plan: "Business", createdAt: "2024-02-12T00:00:00.000Z" }),
  user({ id: "2", name: "Tomás Ferreira", email: "tomas.ferreira@quayside.io", role: "Editor", plan: "Pro", createdAt: "2025-06-01T00:00:00.000Z" }),
  user({ id: "3", name: "Ingrid Solberg", email: "ingrid@fernhill.com", status: "Suspended", createdAt: "2026-03-10T00:00:00.000Z" }),
];

test("search ignores accents and matches email", () => {
  assert.deepEqual(queryUsers(users, { ...DEFAULT_QUERY, q: "tomas" }).map((u) => u.id), ["2"]);
  assert.deepEqual(queryUsers(users, { ...DEFAULT_QUERY, q: "FERNHILL" }).map((u) => u.id), ["3"]);
});

test("filters combine", () => {
  assert.deepEqual(queryUsers(users, { ...DEFAULT_QUERY, status: "Suspended" }).map((u) => u.id), ["3"]);
  assert.equal(queryUsers(users, { ...DEFAULT_QUERY, plan: "Pro", role: "Owner" }).length, 0);
});

test("sorts by date desc by default and by name asc", () => {
  assert.deepEqual(queryUsers(users, DEFAULT_QUERY).map((u) => u.id), ["3", "2", "1"]);
  assert.deepEqual(queryUsers(users, { ...DEFAULT_QUERY, sort: "name", dir: "asc" }).map((u) => u.id), ["3", "1", "2"]);
});

test("validation: required fields, email format, duplicates", () => {
  const bad = validateUser({ name: " a ", email: "nope", role: "Viewer", plan: "Free", status: "Active" }, users);
  assert.ok(bad.name && bad.email);
  const dup = validateUser({ name: "New", email: " MAYA@marlow.app ", role: "Viewer", plan: "Free", status: "Active" }, users);
  assert.match(dup.email ?? "", /already/);
  // editing yourself with your own email is fine
  assert.deepEqual(validateUser({ name: "Tomás F", email: "tomas.ferreira@quayside.io", role: "Editor", plan: "Pro", status: "Active" }, users, "2"), {});
});

test("the last owner can't be demoted or deleted", () => {
  const demote = validateUser({ name: "Maya Okafor", email: "maya@marlow.app", role: "Admin", plan: "Business", status: "Active" }, users, "1");
  assert.ok(demote.role);
  assert.ok(deleteBlocker(users[0], users));
  assert.equal(deleteBlocker(users[1], users), null);
});

test("paginate clamps the page", () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  assert.deepEqual(paginate(items, 3, 10), { rows: [20, 21, 22], page: 3, pages: 3 });
  assert.equal(paginate(items, 99, 10).page, 3);
  assert.deepEqual(paginate([], 1, 10), { rows: [], page: 1, pages: 1 });
});
