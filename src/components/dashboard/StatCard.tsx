import { CountUp } from "@/components/ui/CountUp";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import type { Stat } from "@/lib/data";

const TONES = [
  { text: "text-c1", dot: "bg-c1" },
  { text: "text-c3", dot: "bg-c3" },
  { text: "text-c2", dot: "bg-c2" },
  { text: "text-c4", dot: "bg-c4" },
];

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(30 - ((v - min) / span) * 26).toFixed(1)}`);
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={className} aria-hidden="true">
      <polygon points={`0,32 ${pts.join(" ")} 100,32`} fill="currentColor" opacity="0.12" />
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({ stat, index = 0 }: { stat: Stat; index?: number }) {
  const tone = TONES[index % TONES.length];
  const good = stat.delta === 0 ? null : stat.delta > 0 === stat.goodWhenUp;
  return (
    <div className="group rounded-2xl border border-line bg-panel p-5 shadow-[var(--shadow)] transition-colors hover:border-ink-3/40">
      <p className="flex items-center gap-2 text-[13px] text-ink-2">
        <span className={cx("size-1.5 rounded-full", tone.dot)} />
        {stat.label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="tnum font-display text-[30px] font-semibold leading-none tracking-tight">
          <CountUp value={stat.raw} format={stat.format} />
        </p>
        <Sparkline values={stat.series} className={cx("h-9 w-20 shrink-0 sm:w-24", tone.text)} />
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-3">
        <span
          className={cx(
            "tnum inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
            good === null ? "text-ink-2" : good ? "bg-pos-soft text-pos" : "bg-neg-soft text-neg",
          )}
        >
          <Icon name={stat.delta >= 0 ? "up" : "down"} className="size-3" strokeWidth={2.25} />
          {stat.deltaText}
        </span>
        vs previous 30 days
      </p>
    </div>
  );
}
