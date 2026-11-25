import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

const VARIANTS = {
  primary: "border-transparent bg-accent text-accent-ink shadow-[0_0_0_1px_rgb(0_0_0/0.04),0_6px_20px_-8px_var(--accent)] hover:brightness-105 active:translate-y-px",
  secondary: "border-line bg-panel text-ink shadow-[var(--shadow)] hover:bg-panel-2",
  ghost: "border-transparent text-ink-2 hover:bg-ink/5 hover:text-ink",
  danger: "border-transparent bg-neg text-bg hover:brightness-110",
};

const SIZES = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
  icon: "size-8",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border font-medium transition-[background-color,filter,color,transform] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
