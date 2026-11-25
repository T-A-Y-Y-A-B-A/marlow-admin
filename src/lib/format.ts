const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const money = (n: number) => usd.format(n);
export const moneyCents = (n: number) => usdCents.format(n);
export const moneyCompact = (n: number) => `$${compact.format(n)}`;
export const number = (n: number) => n.toLocaleString("en-US");
export const signedPct = (n: number, digits = 1) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;

// Dates are formatted in UTC so server and client render the same text.
const toDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
export const dayLabel = (iso: string) => toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const fullDate = (iso: string) =>
  toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return fullDate(iso);
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
