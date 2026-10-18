"use client";
import type { Node } from "@/app/strategy/types";

export function MultiNode({
  node,
  checked,
  onToggle,
  onContinue,
}: {
  node: Node;
  checked: Set<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-4">
      <div className="text-xs uppercase tracking-widest text-sky-400 mb-2">
        {node.title}
      </div>
      <p className="text-slate-100 leading-relaxed mb-3">{node.question}</p>
      {node.checks?.map((c) => (
        <div key={c.id} className="mb-2">
          <label className="flex items-start gap-3 rounded-md bg-slate-900/60 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checked.has(c.id)}
              onChange={() => onToggle(c.id)}
              className="mt-0.5 accent-amber-500 w-4 h-4"
            />
            <span className="text-sm text-slate-200">{c.label}</span>
          </label>
          {checked.has(c.id) && c.action && (
            <div className="ml-8 mt-1 rounded border-l-2 border-amber-500 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              → {c.action}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={onContinue}
        className="mt-3 rounded-md border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
      >
        Continue
      </button>
    </div>
  );
}