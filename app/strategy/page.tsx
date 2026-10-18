"use client";

import { useMemo, useState } from "react";
import rulesJson from "./rules.json";
import type { PathEntry, Rules } from "./types";
import { getNode, progress } from "./engine";
import { ProgressBar } from "./ProgressBar";
import { GateNode } from "./GateNode";
import { ChoiceNode } from "./ChoiceNode";
import { ScoreNode } from "./ScoreNode";
import { MultiNode } from "./MultiNode";
import { StopNode } from "./StopNode";
import { SuccessNode } from "./SuccessNode";
import { PathLog } from "./PathLog";
import { StepNodes } from "./StepNodes";

const rules = rulesJson as unknown as Rules;

export default function StrategyPage() {
  const [currentId, setCurrentId] = useState<string>(rules.start);
  const [path, setPath] = useState<PathEntry[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const node = useMemo(() => getNode(rules, currentId), [currentId]);
  const pct = useMemo(() => progress(rules, path), [path]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function advance(nextId: string, result: string) {
    const checkedItems = Array.from(checked).map((id) => {
      const label =
        node.checks?.find((c) => c.id === id)?.label ??
        node.options?.find((o) => o.value === id)?.label ??
        id;
      return { id, label };
    });

    setPath((p) => [
      ...p,
      {
        nodeId: node.id,
        title: node.title,
        result,
        at: Date.now(),
        checked: checkedItems,
      },
    ]);

    setChecked(new Set());
    setCurrentId(nextId);
  }

  function restart() {
    setCurrentId(rules.start);
    setPath([]);
    setChecked(new Set());
  }

  function renderNode() {
    switch (node.type) {
      case "gate":
        return (
          <GateNode
            node={node}
            checked={checked}
            onToggle={toggle}
            onAnswer={(yes) => {
              const next = yes ? node.onYes! : node.onNo!;
              const allMandatoryOk =
                node.checks?.every(
                  (c) => !c.mandatory || checked.has(c.id)
                ) ?? true;
              const result = yes
                ? allMandatoryOk
                  ? "Yes"
                  : "Yes (but mandatory missing)"
                : "No";
              advance(next, result);
            }}
          />
        );

      case "choice":
        return (
          <ChoiceNode
            node={node}
            path={path}
            onPick={(next, label) => advance(next, label)}
          />
        );

      case "score":
        return (
          <ScoreNode
            node={node}
            checked={checked}
            onToggle={toggle}
            onSubmit={(passed, score) => {
              const next = passed ? node.onPass! : node.onFail!;
              advance(
                next,
                passed
                  ? `Pass (${score}/${node.checks?.length})`
                  : `Fail (${score}/${node.checks?.length})`
              );
            }}
          />
        );

      case "multi":
        return (
          <MultiNode
            node={node}
            checked={checked}
            onToggle={toggle}
            onContinue={() =>
              advance(
                checked.size ? node.onYes! : node.onNo!,
                checked.size ? "Special cases ticked" : "None"
              )
            }
          />
        );

      case "terminal":
        return (
          <GateNode
            node={node}
            checked={checked}
            onToggle={toggle}
            onAnswer={() => advance(node.onYes ?? "END", "Journaled")}
          />
        );

     case "success":
            return (
                <SuccessNode
                node={node}
                rules={rules}
                path={path}
                onRestart={restart}
                />
            );
        

      case "stop":
        return <StopNode node={node} onRestart={restart} />;

      default:
        return null;
    }
  }

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-[minmax(420px,1fr)_1fr] bg-slate-950 text-slate-100">
      <div className="overflow-y-auto border-r border-slate-800 p-6">
        <h1 className="text-sm font-semibold text-amber-400 tracking-wide">
          GOLD / SILVER — Guided Execution
        </h1>
        <p className="mb-4 text-xs text-slate-500">
          SMC + SNR + MSNR + News · every gate is a yes/no · no trade if unsure
        </p>
       <StepNodes rules={rules} currentId={currentId} path={path} />
        <div className="mt-4">{renderNode()}</div>
      </div>

      <div className="overflow-y-auto bg-slate-900 p-6">
        <div className="mb-2 text-xs uppercase tracking-widest text-sky-400">
          Path Taken
        </div>
        <PathLog path={path} />
      </div>
    </div>
  );
}