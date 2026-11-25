// Sample data. Everything is generated from fixed seeds so the server and the browser render identical numbers.
import type { Plan, Role, Status, User } from "./users";

export const AS_OF = "2026-11-25";
const END = Date.UTC(2026, 10, 25);
const DAY = 86_400_000;

/** mulberry32 — tiny deterministic PRNG. */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted<T>(rand: () => number, options: [T, number][]): T {
  let x = rand();
  for (const [value, weight] of options) if ((x -= weight) < 0) return value;
  return options[options.length - 1][0];
}

const iso = (t: number) => new Date(Math.round(t)).toISOString();

/* ---------------------------------- Users --------------------------------- */

const NAMES = [
  "Daniel Brennan", "Priya Raman", "Tomás Ferreira", "Hannah Lindqvist", "Kenji Watanabe", "Amara Nwosu",
  "Lucas Moreau", "Sofia Castillo", "Elliot Park", "Noor Haddad", "Ingrid Solberg", "Marcus Bell",
  "Leila Farahani", "Jonah Weiss", "Chiara Romano", "Felix Hartmann", "Aisha Bello", "Oscar Lindgren",
  "Mei Chen", "Rafael Duarte", "Grace O'Connell", "Viktor Novak", "Samuel Adeyemi", "Clara Jensen",
  "Ethan Brooks", "Yuki Tanaka", "Mateo Vargas", "Freya Holm", "Owen Gallagher", "Lina Kowalski",
  "Isaac Mensah", "Nadia Petrova", "Theo Laurent", "Ruth Abebe", "Diego Salazar", "Anouk de Vries",
  "Ben Carter", "Sana Qureshi", "Julian Weber", "Esther Kim", "Kofi Asante", "Paula Jiménez",
  "Arjun Mehta", "Tessa Morgan", "Henrik Dahl", "Imani Clarke", "Pablo Ortega", "Selin Yılmaz",
  "Callum Reid", "Ava Thompson", "Omar Haddad", "Lea Fischer", "Nikhil Rao", "Rosa Martín",
];

const DOMAINS = [
  "northpine.co", "hollis.studio", "quayside.io", "fernhill.com", "brightwork.dev",
  "tidewater.co", "oakline.io", "larkspur.design", "ironleaf.co", "parcel-labs.com",
];

const emailFor = (name: string, domain: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, ".") + `@${domain}`;

export const SEED_USERS: User[] = (() => {
  const rand = prng(7);
  const start = Date.UTC(2024, 2, 1);
  const generated = NAMES.map((name, i): User => {
    const role = weighted<Role>(rand, [["Admin", 0.14], ["Editor", 0.36], ["Viewer", 0.5]]);
    const status = weighted<Status>(rand, [["Active", 0.8], ["Invited", 0.12], ["Suspended", 0.08]]);
    const plan = weighted<Plan>(rand, [["Free", 0.3], ["Pro", 0.45], ["Business", 0.25]]);
    const created = status === "Invited" ? END - rand() * 21 * DAY : start + rand() * (END - 10 * DAY - start);
    const lastActive =
      status === "Invited"
        ? null
        : status === "Suspended"
          ? created + rand() * (END - created) * 0.6
          : END - rand() ** 2.4 * Math.min(END - created, 45 * DAY);
    return {
      id: `usr_${(48_211 + i * 7919).toString(36)}`,
      name,
      email: emailFor(name, DOMAINS[i % DOMAINS.length]),
      role,
      plan,
      status,
      createdAt: iso(created),
      lastActiveAt: lastActive === null ? null : iso(lastActive),
    };
  });
  const owner: User = {
    id: "usr_owner",
    name: "Maya Okafor",
    email: "maya@marlow.app",
    role: "Owner",
    plan: "Business",
    status: "Active",
    createdAt: "2024-02-12T09:14:00.000Z",
    lastActiveAt: "2026-11-24T21:42:00.000Z",
  };
  return [owner, ...generated];
})();
