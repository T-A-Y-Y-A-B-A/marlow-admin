import type { ReactNode, SelectHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export const inputClass =
  "h-9 w-full rounded-md border border-line bg-panel px-3 text-sm text-ink shadow-[var(--shadow)] outline-none transition-[border-color,box-shadow] placeholder:text-ink-3 focus:border-accent-fg focus:ring-3 focus:ring-accent-fg/20 aria-[invalid=true]:border-neg aria-[invalid=true]:focus:ring-neg/15";

export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-neg">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cx("relative", className)}>
      <select className={cx(inputClass, "cursor-pointer appearance-none pr-8")} {...props}>
        {children}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (next: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-accent" : "bg-ink/15",
      )}
    >
      <span
        className={cx(
          "inline-block size-4 rounded-full bg-panel shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
