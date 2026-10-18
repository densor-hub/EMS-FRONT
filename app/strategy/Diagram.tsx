"use client";
import type { PathEntry, Rules } from "@/app/strategy/types";

export function Diagram({
  rules,
  currentId,
  path,
}: {
  rules: Rules;
  currentId: string;
  path: PathEntry[];
}) {
  const seen = new Set<string>();
  const displayIds: string[] = [];
  for (const p of path) {
    if (!seen.has(p.nodeId)) {
      seen.add(p.nodeId);
      displayIds.push(p.nodeId);
    }
  }
  if (!seen.has(currentId)) {
    displayIds.push(currentId);
  }

  if (displayIds.length === 0) {
    return <p className="text-xs text-slate-600">No steps taken yet.</p>;
  }

  return (
    <div>
      {displayIds.map((id, i) => {
        const n = rules.nodes[id];
        if (!n) return null;
        const active = id === currentId;
        const isSuccess = n.type === "success";
        const isStop = n.type === "stop";

        const cls = active
          ? isSuccess
            ? "border-green-500 bg-green-950/40 text-green-200"
            : isStop
            ? "border-red-500 bg-red-950/40 text-red-200"
            : "border-amber-500 bg-slate-800 text-amber-200"
          : isSuccess
          ? "border-green-900 bg-slate-900/60 text-slate-400"
          : isStop
          ? "border-red-900 bg-slate-900/60 text-slate-400"
          : "border-slate-800 bg-slate-900/30 text-slate-600";

        return (
          <div key={`${id}-${i}`}>
            <div
              className={`mb-2 rounded-lg border px-3 py-2 text-[12.5px] transition ${cls}`}
            >
              {n.title}
            </div>
            {i < displayIds.length - 1 && (
              <div className="ml-4 mb-2 text-[11px] text-slate-600">↓</div>
            )}
          </div>
        );
      })}
    </div>
  );
}