"use client";
import { useState } from "react";
import type { PathEntry, Rules } from "./types";

export function StepNodes({
  rules,
  currentId,
  path,
}: {
  rules: Rules;
  currentId: string;
  path: PathEntry[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  // All non-terminal nodes in rules.json order, then terminals.
  const flowNodes = Object.values(rules.nodes).filter(
    (n) => n.type !== "stop" && n.type !== "success"
  );
  const terminalNodes = Object.values(rules.nodes).filter(
    (n) => n.type === "stop" || n.type === "success"
  );
  const allNodes = [...flowNodes, ...terminalNodes];

  const visited = new Set(path.map((p) => p.nodeId));

  return (
    <div className="relative mb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {allNodes.map((n) => {
          const active = n.id === currentId;
          const passed = visited.has(n.id) && !active;
          const isSuccess = n.type === "success";
          const isStop = n.type === "stop";

          let color = "bg-slate-700"; // unvisited
          if (active) {
            color = isSuccess
              ? "bg-green-400 ring-2 ring-green-400/50 scale-125"
              : isStop
              ? "bg-red-400 ring-2 ring-red-400/50 scale-125"
              : "bg-amber-400 ring-2 ring-amber-400/50 scale-125";
          } else if (passed) {
            color = isSuccess ? "bg-green-600" : isStop ? "bg-red-700" : "bg-green-600";
          }

          return (
            <div
              key={n.id}
              className="relative"
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all cursor-default ${color}`}
              />
              {hovered === n.id && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10 whitespace-nowrap rounded bg-slate-800 border border-slate-700 px-2 py-1 text-[11px] text-slate-200 shadow-lg">
                  {n.title}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}