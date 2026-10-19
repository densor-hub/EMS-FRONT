"use client";
import type { Node, PathEntry } from "./types";
import { rankOptions } from "./engine";

export function ChoiceNode({
  node,
  path,
  currentCondition,
  onPick,
}: {
  node: Node;
  path?: PathEntry[];
  currentCondition?: string;
  onPick: (next: string, label: string) => void;
}) {
  // Filter by enabledBy if present.
  let options = node.options ?? [];
  if (currentCondition) {
    const filtered = options.filter(
      (o) => !o.enabledBy || o.enabledBy.includes(currentCondition)
    );
    if (filtered.length > 0) options = filtered;
  }

  // Sort by priority (ascending), then fitness.
  options = [...options].sort((a, b) => {
    const pa = a.priority ?? 999;
    const pb = b.priority ?? 999;
    if (pa !== pb) return pa - pb;
    return 0;
  });

  const hasFitness = options.some((o) => (o.fitness ?? []).length > 0);
  const ranked = rankOptions({ ...node, options }, path ?? []);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-4">
      <div className="text-xs uppercase tracking-widest text-sky-400 mb-2">
        {node.title}
      </div>
      <p className="text-slate-100 leading-relaxed mb-3">{node.question}</p>
      <div className="grid gap-2">
        {ranked.map((o) => (
          <button
            key={o.value}
            onClick={() => onPick(o.next, o.label)}
            className="w-full rounded-md border border-slate-600 bg-slate-900/60 px-4 py-2.5 text-left text-sm text-slate-200 hover:border-amber-500 hover:bg-slate-900"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}