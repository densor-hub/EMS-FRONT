"use client";
import type { Node, PathEntry } from "./types";
import { rankOptions } from "./engine";

export function ChoiceNode({
  node,
  path,
  onPick,
}: {
  node: Node;
  path?: PathEntry[];
  onPick: (next: string, label: string) => void;
}) {
  const hasFitness = node.options?.some((o) => (o.fitness ?? []).length > 0);
  const ranked = rankOptions(node, path ?? []);
  const maxScore = ranked[0]?.score ?? 0;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-4">
      <div className="text-xs uppercase tracking-widest text-sky-400 mb-2">
        {node.title}
      </div>
      <p className="text-slate-100 leading-relaxed mb-3">{node.question}</p>

      <div className="grid gap-2">
        {ranked.map((o) => {
          const isBest = hasFitness && maxScore > 0 && o.score === maxScore;
          const isWeak = hasFitness && o.score === 0;
          return (
            <button
              key={o.value}
              onClick={() => onPick(o.next, o.label)}
              className={[
                "w-full rounded-md border px-4 py-2.5 text-left text-sm transition flex items-start justify-between gap-3",
                isBest
                  ? "border-amber-500 bg-amber-950/40 text-amber-100 hover:bg-amber-900/40"
                  : isWeak
                  ? "border-slate-700 bg-slate-900/40 text-slate-500 hover:border-slate-500"
                  : "border-slate-600 bg-slate-900/60 text-slate-200 hover:border-amber-500 hover:bg-slate-900",
              ].join(" ")}
            >
              <span>
                <span className="block">{o.label}</span>
                {hasFitness && o.matched.length > 0 && (
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Matches: {o.matched.length} — {o.matched.join(", ")}
                  </span>
                )}
              </span>
              {hasFitness && (
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    isBest
                      ? "bg-amber-500 text-slate-950"
                      : isWeak
                      ? "bg-slate-800 text-slate-500"
                      : "bg-slate-800 text-slate-400",
                  ].join(" ")}
                >
                  {o.score}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {hasFitness && maxScore === 0 && (
        <p className="mt-3 text-xs text-slate-500 italic">
          No upstream matches — all setups look equally unlikely from the
          current path. Re-check earlier steps, or pick based on chart context.
        </p>
      )}
    </div>
  );
}