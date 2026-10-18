import type { Node, Option, PathEntry, Rules } from "./types";

export function getNode(rules: Rules, id: string): Node {
  const n = rules.nodes[id];
  if (!n) throw new Error(`Unknown node: ${id}`);
  return n;
}

export function resolveGate(
  node: Node,
  checkedIds: Set<string>
): string {
  const allChecksPassed =
    node.checks?.every((c) => !c.mandatory || checkedIds.has(c.id)) ?? true;
  return allChecksPassed ? node.onYes! : node.onNo!;
}

export function resolveScore(
  node: Node,
  checkedIds: Set<string>
): { next: string; score: number; passed: boolean } {
  const checks = node.checks ?? [];
  const mandatoryOk = checks
    .filter((c) => c.mandatory)
    .every((c) => checkedIds.has(c.id));
  const score = checks.filter((c) => checkedIds.has(c.id)).length;
  const passed = mandatoryOk && score >= (node.threshold ?? 0);
  return {
    next: passed ? node.onPass! : node.onFail!,
    score,
    passed,
  };
}

export function progress(
  rules: Rules,
  path: PathEntry[]
): number {
  const skip = (t: string) => t === "stop" || t === "success";
  const total = Object.keys(rules.nodes).filter(
    (k) => !skip(rules.nodes[k].type)
  ).length;
  const visited = new Set(
    path
      .map((p) => p.nodeId)
      .filter((id) => {
        const n = rules.nodes[id];
        return n && !skip(n.type);
      })
  ).size;
  return total === 0
    ? 0
    : Math.min(100, Math.round((visited / total) * 100));
}

export function collectCheckedFromPath(
  path: PathEntry[] | undefined
): Set<string> {
  const s = new Set<string>();
  (path ?? []).forEach((p) => (p.checked ?? []).forEach((c) => s.add(c.id)));
  return s;
}

export interface ScoredOption extends Option {
  score: number;
  matched: string[];
}

export function rankOptions(
  node: Node,
  path: PathEntry[] | undefined
): ScoredOption[] {
  const upstream = collectCheckedFromPath(path);
  const opts = node.options ?? [];
  return opts
    .map((o) => {
      const matched = (o.fitness ?? []).filter((id) => upstream.has(id));
      return { ...o, score: matched.length, matched };
    })
    .sort((a, b) => b.score - a.score);
}