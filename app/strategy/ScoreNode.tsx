"use client";
import type { Node } from "@/app/strategy/types";
import { resolveScore } from "@/app/strategy/engine";

export function ScoreNode({
  node,
  checked,
  onToggle,
  onSubmit,
}: {
  node: Node;
  checked: Set<string>;
  onToggle: (id: string) => void;
  onSubmit: (passed: boolean, score: number) => void;
}) {
  const preview = resolveScore(node, checked);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-4">
      <div className="text-xs uppercase tracking-widest text-sky-400 mb-2">
        {node.title}
      </div>
      <p className="text-slate-100 leading-relaxed mb-3">{node.question}</p>

      {node.checks?.map((c) => (
        <label
          key={c.id}
          className="flex items-start gap-3 rounded-md bg-slate-900/60 hover:bg-slate-900 px-3 py-2 mb-1.5 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={checked.has(c.id)}
            onChange={() => onToggle(c.id)}
            className="mt-0.5 accent-amber-500 w-4 h-4"
          />
          <span className="text-sm text-slate-200">
            {c.label}
            {c.mandatory && (
              <span className="ml-2 text-[10px] font-semibold text-red-400">
                MANDATORY
              </span>
            )}
          </span>
        </label>
      ))}

      <div className="mt-3 text-sm text-slate-400">
        Score: <b className="text-amber-400 text-base">{preview.score}</b> /{" "}
        {node.checks?.length ?? 0} — threshold {node.threshold}
        {!preview.passed && (
          <span className="ml-2 text-red-400">
            (not passing — mandatory or score below threshold)
          </span>
        )}
      </div>

      <button
        onClick={() => onSubmit(preview.passed, preview.score)}
        className="mt-3 rounded-md border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
      >
        Submit score
      </button>
    </div>
  );
}