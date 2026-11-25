"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { AS_OF, REGION_REVENUE } from "@/lib/data";

/** Downloads the region × month revenue table as CSV. */
export function ExportButton() {
  const toast = useToast();

  const download = () => {
    const header = ["Region", ...REGION_REVENUE.months.map((m) => m.full), "Total"];
    const rows = REGION_REVENUE.regions.map((r) => [r.name, ...r.values, r.total]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `marlow-revenue-by-region-${AS_OF}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    toast("Revenue report downloaded.");
  };

  return (
    <Button variant="primary" onClick={download}>
      <Icon name="arrowDown" />
      Export CSV
    </Button>
  );
}
