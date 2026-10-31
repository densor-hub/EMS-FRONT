"use client";

import { useMemo, useState } from "react";
import rulesJson from "./rules.json";
import type { Check, PathEntry, Rules } from "./types";
import { getNode } from "./engine";
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
  const currentMode = path[path.length - 1]?.mode;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function advance(nextId: string, result: string, mode?: string) {
    let pool: Check[] = node.checks ?? [];
    if (node.conditionalChecks) {
      const key =
        mode && node.conditionalChecks[mode]
          ? mode
          : Object.keys(node.conditionalChecks)[0];
      pool = [...pool, ...(node.conditionalChecks[key] ?? [])];
    }

    const checkedItems = Array.from(checked).map((id) => {
      const label =
        pool.find((c) => c.id === id)?.label ??
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
        mode,
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
      case "gate": {
        let visibleChecks = node.checks ?? [];

        if (node.id === "first_things") {
          const newsHandled = path.some((p) => p.nodeId === "news_check");
          if (newsHandled) {
            visibleChecks = visibleChecks.filter((c) => c.id !== "ft_news");
          }
        }

        let conditionChecks: Check[] = [];
        let conditionLabel = "";
        if (node.conditionalChecks) {
          const conditionKey =
            currentMode && node.conditionalChecks[currentMode]
              ? currentMode
              : Object.keys(node.conditionalChecks)[0];
          conditionChecks = node.conditionalChecks[conditionKey] ?? [];

          const conditionOption = rules.nodes["market_condition"]?.options?.find(
            (o) => o.value === conditionKey
          );
          conditionLabel = conditionOption?.label ?? conditionKey;
        }

        let sections:
          | { title: string; checks: Check[] }[]
          | undefined = undefined;

        if (node.conditionalChecks && conditionChecks.length > 0) {
          if (visibleChecks.length > 0) {
            sections = [
              { title: "Prerequisite", checks: visibleChecks },
              {
                title: `Market Condition — ${conditionLabel}`,
                checks: conditionChecks,
              },
            ];
          } else {
            sections = [
              {
                title: `Market Condition — ${conditionLabel}`,
                checks: conditionChecks,
              },
            ];
          }
        }

        const visibleNode: typeof node = sections
          ? { ...node, checks: sections.flatMap((s) => s.checks) }
          : { ...node, checks: visibleChecks };

        return (
          <GateNode
            node={visibleNode}
            checked={checked}
            onToggle={toggle}
            onAnswer={(yes) => {
              let next = yes ? node.onYes! : node.onNo!;
              let mode: string | undefined = undefined;

              if (yes && node.conditionalNext) {
                for (const c of node.conditionalNext) {
                  if (c.when.every((id) => checked.has(id))) {
                    const alreadyVisited = path.some(
                      (p) => p.nodeId === c.next
                    );
                    if (alreadyVisited) continue;
                    next = c.next;
                    mode = c.mode;
                    break;
                  }
                }
              }

              advance(next, yes ? "Yes" : "No", mode);
            }}
            sections={sections}
          />
        );
      }

      case "choice":
        return (
          <ChoiceNode
            node={node}
            path={path}
            mode={currentMode}
            onPick={(next, label, value) => {
              // For market_condition, the picked option's value IS the
              // condition key used in downstream conditionalChecks.
              const outMode =
                node.id === "market_condition" ? value : currentMode;
              advance(next, label, outMode);
            }}
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
                  : `Fail (${score}/${node.checks?.length})`,
                currentMode
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
                checked.size ? "Special cases ticked" : "None",
                currentMode
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
            onAnswer={() =>
              advance(node.onYes ?? "END", "Journaled", currentMode)
            }
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