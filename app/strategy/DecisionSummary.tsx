"use client";
import type { PathEntry, Rules } from "./types";

export function DecisionSummary({
  rules,
  path,
}: {
  rules: Rules;
  path: PathEntry[];
}) {
  // Pull specific decisions out of the path by node id.
  const find = (nodeId: string) => path.find((p) => p.nodeId === nodeId);

  const setup = find("route_setup");
  const entry = find("entries");
  const takeProfits = find("take_profits");
  const profitProtection = find("profit_protection");

  const rows: { label: string; value: string; sub?: string[] }[] = [];

  if (setup) {
    rows.push({
      label: "Setup",
      value: setup.result,
    });
  }
  if (entry) {
    rows.push({
      label: "Entry",
      value: entry.result,
    });
  }
  if (takeProfits && takeProfits.checked.length > 0) {
    rows.push({
      label: "Take Profit(s)",
      value: takeProfits.checked.map((c) => c.label).join(" · "),
    });
  }
  if (profitProtection && profitProtection.checked.length > 0) {
    rows.push({
      label: "Profit Protection",
      value: profitProtection.checked.map((c) => c.label).join(" · "),
    });
  }

  // Fallback: if none of the key nodes were in the path, don't render the summary.
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-green-900 bg-green-950/20 p-4 mb-4">
      <div className="text-xs uppercase tracking-widest text-green-400 mb-3">
        Decision Summary
      </div>
      <dl className="space-y-2">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-[11px] uppercase tracking-wider text-slate-400">
              {r.label}
            </dt>
            <dd className="text-sm text-slate-100 leading-relaxed">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}