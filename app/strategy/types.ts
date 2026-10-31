export type NodeType =
  | "gate"
  | "choice"
  | "score"
  | "multi"
  | "terminal"
  | "stop"
  | "success";

export interface Check {
  id: string;
  label: string;
  mandatory?: boolean;
  action?: string;
}

export interface ExtraQuestion {
  id: string;
  question: string;
  ifYes: string;
}

export interface Option {
  value: string;
  label: string;
  next: string;
  fitness?: string[];
  priority?: number;
  enabledBy?: string[];
  modes?: string[];
}

export interface ConditionalRoute {
  when: string[];
  next: string;
  mode?: string;
}

export interface Node {
  id: string;
  title: string;
  type: NodeType;
  question: string;
  note?: string;
  message?: string;
  checks?: Check[];
  conditionalChecks?: Record<string, Check[]>;
  options?: Option[];
  extraQuestions?: ExtraQuestion[];
  conditionalNext?: ConditionalRoute[];
  onYes?: string;
  onNo?: string;
  onPass?: string;
  onFail?: string;
  threshold?: number;
}

export interface Rules {
  version: string;
  title: string;
  start: string;
  nodes: Record<string, Node>;
}

export interface PathEntry {
  nodeId: string;
  title: string;
  result: string;
  at: number;
  checked: { id: string; label: string }[];
  mode?: string;
}