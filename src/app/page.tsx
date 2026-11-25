import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/ui/Card";
import { AS_OF, STATS } from "@/lib/data";

export const metadata: Metadata = { title: "Overview" };

const today = new Date(`${AS_OF}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

export default function OverviewPage() {
  return (
    <>
      <PageHeader eyebrow={today} title="Overview" description="Revenue and subscriber health across all workspaces." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={s.label} className="enter" style={stagger(i + 1)}>
            <StatCard stat={s} index={i} />
          </div>
        ))}
      </div>

      <div className="enter mt-4" style={stagger(6)}>
        <RevenueChart />
      </div>
    </>
  );
}
