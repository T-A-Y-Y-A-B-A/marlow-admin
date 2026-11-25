// Sample data. Everything is generated from fixed seeds so the server and the browser render identical numbers.
import { dayLabel, money, moneyCents, number, signedPct } from "./format";
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

/* --------------------------------- Revenue -------------------------------- */

export interface DailyRevenue {
  date: string;
  value: number;
}

/** Two years of daily net revenue ending on AS_OF. */
export const DAILY_REVENUE: DailyRevenue[] = (() => {
  const rand = prng(42);
  const weekday = [0.8, 1.05, 1.09, 1.08, 1.05, 0.99, 0.84]; // Sun → Sat
  return Array.from({ length: 730 }, (_, i) => {
    const d = new Date(END - (729 - i) * DAY);
    const trend = 3650 + i * 3.4 + Math.sin(i / 58) * 170;
    const blackFriday = d.getUTCMonth() === 10 && d.getUTCDate() >= 24 ? 1.16 : 1;
    const value = trend * weekday[d.getUTCDay()] * blackFriday * (0.93 + rand() * 0.14);
    return { date: d.toISOString().slice(0, 10), value: Math.round(value) };
  });
})();

export type RangeKey = "30D" | "90D" | "12M";

export interface RevenuePoint {
  label: string;
  full: string;
  value: number;
  prev: number;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function revenueRange(range: RangeKey): { points: RevenuePoint[]; total: number; prevTotal: number } {
  let points: RevenuePoint[];
  if (range === "12M") {
    const end = new Date(END);
    points = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11 + i, 1));
      const key = month.toISOString().slice(0, 7);
      const prevKey = `${month.getUTCFullYear() - 1}${key.slice(4)}`;
      const toDate = i === 11; // current month is partial — compare it to the same days last year
      let value = 0;
      let prev = 0;
      for (const d of DAILY_REVENUE) {
        if (d.date.startsWith(key)) value += d.value;
        else if (d.date.startsWith(prevKey) && (!toDate || Number(d.date.slice(8)) <= end.getUTCDate())) prev += d.value;
      }
      const name = MONTHS[month.getUTCMonth()];
      return { label: name.slice(0, 3), full: `${name} ${month.getUTCFullYear()}${toDate ? " · to date" : ""}`, value, prev };
    });
  } else {
    const days = range === "30D" ? 30 : 90;
    const current = DAILY_REVENUE.slice(-days);
    const previous = DAILY_REVENUE.slice(-2 * days, -days);
    points = current.map((d, i) => ({
      label: dayLabel(d.date),
      full: new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
      value: d.value,
      prev: previous[i].value,
    }));
  }
  const total = points.reduce((s, p) => s + p.value, 0);
  const prevTotal = points.reduce((s, p) => s + p.prev, 0);
  return { points, total, prevTotal };
}

/* ---------------------------------- Stats --------------------------------- */

const sumWindow = (endOffset: number) =>
  DAILY_REVENUE.slice(DAILY_REVENUE.length - endOffset - 30, DAILY_REVENUE.length - endOffset).reduce((s, d) => s + d.value, 0);

// Rolling 30-day windows, oldest first.
const REVENUE = Array.from({ length: 12 }, (_, i) => sumWindow((11 - i) * 30));
const SUBSCRIBERS = [2610, 2688, 2741, 2803, 2866, 2930, 3012, 3075, 3141, 3198, 3264, 3412];
const CHURN = [3.4, 3.1, 3.3, 2.9, 2.8, 3.0, 2.7, 2.6, 2.6, 2.4, 2.5, 2.1];
const ARPU = REVENUE.map((v, i) => v / SUBSCRIBERS[i]);

const pctChange = (s: number[]) => ((s[11] - s[10]) / s[10]) * 100;

export type StatFormat = "money" | "money2" | "int" | "pct1";

export interface Stat {
  label: string;
  value: string;
  raw: number;
  format: StatFormat;
  delta: number;
  deltaText: string;
  goodWhenUp: boolean;
  series: number[];
}

export const STATS: Stat[] = [
  { label: "Net revenue · 30d", value: money(REVENUE[11]), raw: REVENUE[11], format: "money", delta: pctChange(REVENUE), deltaText: signedPct(pctChange(REVENUE)), goodWhenUp: true, series: REVENUE },
  {
    label: "Active subscribers",
    value: number(SUBSCRIBERS[11]),
    raw: SUBSCRIBERS[11],
    format: "int",
    delta: SUBSCRIBERS[11] - SUBSCRIBERS[10],
    deltaText: `+${SUBSCRIBERS[11] - SUBSCRIBERS[10]}`,
    goodWhenUp: true,
    series: SUBSCRIBERS,
  },
  {
    label: "Monthly churn",
    value: `${CHURN[11].toFixed(1)}%`,
    raw: CHURN[11],
    format: "pct1",
    delta: CHURN[11] - CHURN[10],
    deltaText: `${(CHURN[11] - CHURN[10]).toFixed(1)} pts`,
    goodWhenUp: false,
    series: CHURN,
  },
  { label: "Revenue per subscriber", value: moneyCents(ARPU[11]), raw: ARPU[11], format: "money2", delta: pctChange(ARPU), deltaText: signedPct(pctChange(ARPU)), goodWhenUp: true, series: ARPU },
];

/* --------------------------------- Regions -------------------------------- */

export interface City {
  name: string;
  region: string;
  lat: number;
  lon: number;
  subscribers: number;
}

export const CITIES: City[] = [
  { name: "New York", region: "North America", lat: 40.71, lon: -74.01, subscribers: 486 },
  { name: "San Francisco", region: "North America", lat: 37.77, lon: -122.42, subscribers: 412 },
  { name: "Toronto", region: "North America", lat: 43.65, lon: -79.38, subscribers: 198 },
  { name: "Austin", region: "North America", lat: 30.27, lon: -97.74, subscribers: 167 },
  { name: "London", region: "Europe", lat: 51.51, lon: -0.13, subscribers: 402 },
  { name: "Berlin", region: "Europe", lat: 52.52, lon: 13.4, subscribers: 251 },
  { name: "Amsterdam", region: "Europe", lat: 52.37, lon: 4.9, subscribers: 173 },
  { name: "Stockholm", region: "Europe", lat: 59.33, lon: 18.07, subscribers: 118 },
  { name: "Lisbon", region: "Europe", lat: 38.72, lon: -9.14, subscribers: 96 },
  { name: "Singapore", region: "Asia Pacific", lat: 1.35, lon: 103.82, subscribers: 189 },
  { name: "Tokyo", region: "Asia Pacific", lat: 35.68, lon: 139.69, subscribers: 164 },
  { name: "Sydney", region: "Asia Pacific", lat: -33.87, lon: 151.21, subscribers: 149 },
  { name: "Bengaluru", region: "Asia Pacific", lat: 12.97, lon: 77.59, subscribers: 141 },
  { name: "São Paulo", region: "Latin America", lat: -23.55, lon: -46.63, subscribers: 148 },
  { name: "Mexico City", region: "Latin America", lat: 19.43, lon: -99.13, subscribers: 97 },
  { name: "Bogotá", region: "Latin America", lat: 4.71, lon: -74.07, subscribers: 54 },
  { name: "Dubai", region: "Middle East & Africa", lat: 25.2, lon: 55.27, subscribers: 71 },
  { name: "Lagos", region: "Middle East & Africa", lat: 6.52, lon: 3.38, subscribers: 58 },
  { name: "Nairobi", region: "Middle East & Africa", lat: -1.29, lon: 36.82, subscribers: 38 },
];

export const REGIONS = Object.entries(
  CITIES.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.region]: (acc[c.region] ?? 0) + c.subscribers }), {}),
)
  .map(([name, subscribers]) => ({ name, subscribers }))
  .sort((a, b) => b.subscribers - a.subscribers);

/* -------------------------------- Activity -------------------------------- */

export type ActivityTone = "pos" | "neg" | "warn" | "neutral";

export const ACTIVITY: { who: string; what: string; when: string; tone: ActivityTone }[] = [
  { who: "Lea Fischer", what: "upgraded Fernhill to Business", when: "12 min ago", tone: "pos" },
  { who: "Billing", what: "couldn’t charge Oakline ($297.00). Card declined, retrying tomorrow.", when: "48 min ago", tone: "neg" },
  { who: "Kenji Watanabe", what: "invited 3 teammates to Quayside", when: "2 h ago", tone: "neutral" },
  { who: "Payouts", what: "sent $41,280.00 to the operating account", when: "5 h ago", tone: "pos" },
  { who: "Tidewater", what: "moved from Business to Pro", when: "Yesterday", tone: "warn" },
  { who: "Ruth Abebe", what: "started a 14-day trial", when: "Yesterday", tone: "neutral" },
];
