"use client";
import type { Node } from "@/app/strategy/types";

export function StopNode({
  node,
  onRestart,
}: {
  node: Node;
  onRestart: () => void;
}) {
  const isEnd = node.id === "END";
  return (
    <div className="rounded-xl border border-red-800 bg-red-950/40 p-5 mb-4">
      <div className="text-xs uppercase tracking-widest text-red-400 mb-2">
        {node.title}
      </div>
      <p className="text-red-100 leading-relaxed">{node.message}</p>
      <button
        onClick={onRestart}
        className="mt-4 rounded-md border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-amber-500"
      >
        {isEnd ? "Start new cycle" : "Restart"}
      </button>
    </div>
  );
}