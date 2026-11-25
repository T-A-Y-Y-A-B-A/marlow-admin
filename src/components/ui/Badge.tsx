import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { Plan, Status } from "@/lib/users";

const TONES = {
  pos: "bg-pos-soft text-pos",
  neg: "bg-neg-soft text-neg",
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent-fg",
  neutral: "bg-ink/[0.06] text-ink-2",
  solid: "bg-ink text-bg",
};

export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<Status, Tone> = { Active: "pos", Invited: "warn", Suspended: "neg" };
const PLAN_TONE: Record<Plan, Tone> = { Free: "neutral", Pro: "accent", Business: "solid" };

export const StatusBadge = ({ status }: { status: Status }) => (
  <Badge tone={STATUS_TONE[status]} dot>
    {status}
  </Badge>
);

export const PlanBadge = ({ plan }: { plan: Plan }) => <Badge tone={PLAN_TONE[plan]}>{plan}</Badge>;
