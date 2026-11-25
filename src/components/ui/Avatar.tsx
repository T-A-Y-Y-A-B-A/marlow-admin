import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/format";

/** Stable hue per name, so the same person always gets the same colour. */
const hue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export function Avatar({ name, className = "size-8 text-xs" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ "--h": hue(name) } as CSSProperties}
      className={cx("avatar inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold", className)}
    >
      {initials(name) || "?"}
    </span>
  );
}
