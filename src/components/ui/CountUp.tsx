"use client";

import { useEffect, useRef } from "react";
import type { StatFormat } from "@/lib/data";
import { money, moneyCents, number } from "@/lib/format";

const FORMATS: Record<StatFormat, (n: number) => string> = {
  money,
  money2: moneyCents,
  int: (n) => number(Math.round(n)),
  pct1: (n) => `${n.toFixed(1)}%`,
};

/** Renders the final value on the server, then counts up from zero once in the browser. */
export function CountUp({ value, format, className }: { value: number; format: StatFormat; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const reduce = document.documentElement.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce) return;
    const fmt = FORMATS[format];
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      el.textContent = fmt(value * (1 - (1 - t) ** 4));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, format]);

  return (
    <span ref={ref} className={className}>
      {FORMATS[format](value)}
    </span>
  );
}
