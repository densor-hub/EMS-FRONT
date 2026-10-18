"use client";
import type { Node, PathEntry, Rules } from "./types";
import { DecisionSummary } from "./DecisionSummary";

export function SuccessNode({
  node,
  rules,
  path,
  onRestart,
}: {
  node: Node;
  rules: Rules;
  path: PathEntry[];
  onRestart: () => void;
}) {
  return (
    <div className="rounded-xl border border-green-800 bg-green-950/40 p-5 mb-4">
      <div className="text-xs uppercase tracking-widest text-green-400 mb-2">
        {node.title}
      </div>
      <p className="text-green-100 leading-relaxed mb-4">{node.message}</p>

      <DecisionSummary rules={rules} path={path} />

      <button
        onClick={onRestart}
        className="rounded-md border border-green-700 bg-green-900/60 px-4 py-2 text-sm text-green-200 hover:border-green-500"
      >
        Start new cycle
      </button>
    </div>
  );
}