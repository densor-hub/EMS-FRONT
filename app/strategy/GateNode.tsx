"use client";
import type { Check, Node } from "./types";

interface Section {
  title: string;
  checks: Check[];
}

interface Props {
  node: Node;
  checked: Set<string>;
  onToggle: (id: string) => void;
  onAnswer: (yes: boolean) => void;
  sections?: Section[];
}

export function GateNode({
  node,
  checked,
  onToggle,
  onAnswer,
  sections,
}: Props) {
  const renderCheck = (c: Check) => (
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
  );

  const allChecks = sections
    ? sections.flatMap((s) => s.checks)
    : node.checks ?? [];

  const mandatoryMissing = allChecks.some(
    (c) => c.mandatory && !checked.has(c.id)
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-4">
      <div className="text-xs uppercase tracking-widest text-sky-400 mb-2">
        {node.title}
      </div>
      <p className="text-slate-100 leading-relaxed mb-3">{node.question}</p>

      {sections ? (
        sections.map((section, i) => (
          <div key={`${section.title}-${i}`} className={i > 0 ? "mt-4" : ""}>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 pb-1 border-b border-slate-700">
              {section.title}
            </div>
            {section.checks.map(renderCheck)}
          </div>
        ))
      ) : (
        <>{node.checks?.map(renderCheck)}</>
      )}

      {node.note && (
        <div className="mt-3 rounded border-l-2 border-amber-500 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          {node.note}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => onAnswer(true)}
          className="rounded-md border border-green-700 bg-green-950/60 px-4 py-2 text-sm text-green-300 hover:border-green-500"
        >
          Yes — continue
        </button>
        <button
          onClick={() => onAnswer(false)}
          className="rounded-md border border-red-800 bg-red-950/60 px-4 py-2 text-sm text-red-300 hover:border-red-500"
        >
          No — stop
        </button>
      </div>

      {mandatoryMissing && (
        <p className="mt-2 text-xs text-red-400">
          Mandatory checks not ticked — "Yes" will route to the stop node.
        </p>
      )}
    </div>
  );
}