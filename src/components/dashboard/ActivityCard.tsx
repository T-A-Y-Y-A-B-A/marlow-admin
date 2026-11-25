import { Card } from "@/components/ui/Card";
import { cx } from "@/lib/cx";
import { ACTIVITY, type ActivityTone } from "@/lib/data";

const DOT: Record<ActivityTone, string> = { pos: "bg-pos", neg: "bg-neg", warn: "bg-warn", neutral: "bg-ink-3" };

export function ActivityCard({ className }: { className?: string }) {
  return (
    <Card className={className} title="Activity" subtitle="Billing and account events">
      <ol className="relative px-5 pb-5 pt-4">
        {ACTIVITY.map((a, i) => (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < ACTIVITY.length - 1 && <span className="absolute left-[3.5px] top-3 h-full w-px bg-line" aria-hidden="true" />}
            <span className={cx("relative mt-1.5 size-2 shrink-0 rounded-full ring-4 ring-panel", DOT[a.tone])} aria-hidden="true" />
            <div className="min-w-0 text-sm leading-snug">
              <p>
                <span className="font-medium">{a.who}</span> <span className="text-ink-2">{a.what}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-3">{a.when}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
