"use client";

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Card } from "@/components/ui/Card";
import { cx } from "@/lib/cx";
import { revenueRange, type RangeKey } from "@/lib/data";
import { money, moneyCompact, signedPct } from "@/lib/format";

const RANGES: { key: RangeKey; label: string; compare: string }[] = [
  { key: "30D", label: "30D", compare: "previous 30 days" },
  { key: "90D", label: "90D", compare: "previous 90 days" },
  { key: "12M", label: "12M", compare: "same months last year" },
];

/** Round the axis max up to a value that splits into four readable steps. */
function niceMax(v: number) {
  const exp = 10 ** Math.floor(Math.log10(v));
  const step = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => s * exp >= v) ?? 10;
  return step * exp;
}

export function RevenueChart({ className }: { className?: string }) {
  const [range, setRange] = useState<RangeKey>("30D");
  const [active, setActive] = useState<number | null>(null);
  const { points, total, prevTotal } = useMemo(() => revenueRange(range), [range]);

  const n = points.length;
  const max = niceMax(Math.max(...points.map((p) => Math.max(p.value, p.prev))));
  const x = (i: number) => (i / (n - 1)) * 1000;
  const y = (v: number) => 100 - (v / max) * 100;
  const path = (key: "value" | "prev") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(2)}`).join("");
  const line = path("value");
  const change = ((total - prevTotal) / prevTotal) * 100;
  const xTicks = [0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4));
  const compare = RANGES.find((r) => r.key === range)!.compare;
  const point = active === null ? null : points[active];

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setActive(Math.min(n - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
  };

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n };
    if (!(e.key in moves)) return;
    e.preventDefault();
    setActive((i) => Math.min(n - 1, Math.max(0, (i ?? n - 1) + moves[e.key])));
  };

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4">
        <div>
          <h2 className="text-[15px] font-semibold">Daily revenue</h2>
          <p className="tnum mt-2 font-display text-[32px] font-semibold leading-none tracking-tight">{money(total)}</p>
          <p className="mt-2 text-xs text-ink-3">
            <span className={cx("tnum font-medium", change >= 0 ? "text-pos" : "text-neg")}>{signedPct(change)}</span> vs {compare}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div role="radiogroup" aria-label="Date range" className="inline-flex rounded-lg bg-ink/[0.06] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={range === r.key}
                onClick={() => {
                  setRange(r.key);
                  setActive(null);
                }}
                className={cx(
                  "rounded-md px-2.5 py-1 font-mono text-xs transition-colors",
                  range === r.key ? "bg-panel text-ink shadow-[var(--shadow)]" : "text-ink-2 hover:text-ink",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded bg-c1" /> This period
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 border-t-2 border-dashed border-c2" /> Previous
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-6">
        <div className="relative ml-10 h-56 sm:h-64">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${t * 100}%` }}>
              <span className="tnum absolute -left-10 w-8 -translate-y-1/2 text-right text-[11px] text-ink-3">{moneyCompact(t * max)}</span>
            </div>
          ))}

          <svg key={range} viewBox="0 0 1000 100" preserveAspectRatio="none" className="reveal absolute inset-0 size-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--c1)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--c1)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path("prev")} fill="none" stroke="var(--c2)" strokeWidth="1.5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" opacity="0.8" />
            <path d={`${line}L1000,100L0,100Z`} fill="url(#revenue-fill)" />
            <path d={line} fill="none" stroke="var(--c1)" strokeWidth="2.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {point && active !== null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-ink/20" style={{ left: `${(active / (n - 1)) * 100}%` }} />
              <div
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-c1 shadow"
                style={{ left: `${(active / (n - 1)) * 100}%`, top: `${y(point.value)}%` }}
              />
              <div
                className={cx(
                  "pointer-events-none absolute top-2 z-10 w-48 rounded-lg border border-line bg-panel p-3 text-xs shadow-lg",
                  active / (n - 1) > 0.55 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3",
                )}
                style={{ left: `${(active / (n - 1)) * 100}%` }}
              >
                <p className="font-medium text-ink">{point.full}</p>
                <dl className="tnum mt-2 space-y-1">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-2">This period</dt>
                    <dd className="font-medium">{money(point.value)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-2">Previous</dt>
                    <dd>{money(point.prev)}</dd>
                  </div>
                </dl>
                <p className={cx("tnum mt-2 border-t border-line pt-2 font-medium", point.value >= point.prev ? "text-pos" : "text-neg")}>
                  {signedPct(((point.value - point.prev) / point.prev) * 100)}
                </p>
              </div>
            </>
          )}

          <div
            tabIndex={0}
            role="group"
            aria-label={`Revenue chart, ${money(total)} total, ${signedPct(change)} vs ${compare}. Use arrow keys to inspect points.`}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            className="absolute inset-0 cursor-crosshair touch-pan-y rounded focus-visible:outline-offset-4"
          />
          <p className="sr-only" aria-live="polite">
            {point ? `${point.full}: ${money(point.value)}, previous ${money(point.prev)}` : ""}
          </p>
        </div>

        <div className="relative ml-10 mt-2 h-4 text-[11px] text-ink-3">
          {xTicks.map((i, k) => (
            <span
              key={i}
              className={cx("tnum absolute whitespace-nowrap", k === 0 ? "" : k === 4 ? "-translate-x-full" : "-translate-x-1/2")}
              style={{ left: `${(i / (n - 1)) * 100}%` }}
            >
              {points[i].label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
