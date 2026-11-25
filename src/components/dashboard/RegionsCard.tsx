import { Card } from "@/components/ui/Card";
import { CITIES, REGIONS } from "@/lib/data";
import { cx } from "@/lib/cx";
import { number } from "@/lib/format";
import { Globe } from "./Globe";

const total = REGIONS.reduce((s, r) => s + r.subscribers, 0);
const topCities = [...CITIES].sort((a, b) => b.subscribers - a.subscribers).slice(0, 5);

export function RegionsCard({ className }: { className?: string }) {
  return (
    <Card
      className={className}
      title="Subscribers by region"
      subtitle={`${number(total)} active in ${CITIES.length} cities`}
      action={<span className="hidden font-mono text-[11px] text-ink-3 sm:inline">drag to rotate</span>}
    >
      <div className="grid items-center gap-6 p-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Globe cities={CITIES} className="mx-auto aspect-square w-full max-w-[300px]" />
        <div>
          <ul className="space-y-3.5">
            {REGIONS.map((r, i) => {
              const share = (r.subscribers / total) * 100;
              return (
                <li key={r.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{r.name}</span>
                    <span className="tnum shrink-0 text-ink-2">
                      {number(r.subscribers)} <span className="ml-1 inline-block w-10 text-right text-xs text-ink-3">{share.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                    <div className={cx("h-full rounded-full bg-accent", i > 1 && "opacity-60")} style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
            Top cities:{" "}
            {topCities.map((c, i) => (
              <span key={c.name} className="text-ink-2">
                {c.name} <span className="tnum text-ink-3">{number(c.subscribers)}</span>
                {i < topCities.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      </div>
    </Card>
  );
}
