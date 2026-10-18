import type { PathEntry } from "./types";

export function PathLog({ path }: { path: PathEntry[] }) {
  if (!path.length) {
    return <p className="text-xs text-slate-600">No steps taken yet.</p>;
  }
  return (
    <ul className="space-y-3 text-xs text-slate-400">
      {path.map((p, i) => (
        <li key={i} className="border-b border-slate-800 pb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-slate-600">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-slate-200 font-medium">{p.title}</span>
            <span className="text-amber-400">— {p.result}</span>
          </div>
          {p.checked.length > 0 && (
            <ul className="mt-1 ml-7 space-y-0.5">
              {p.checked.map((c) => (
                <li key={c.id} className="text-slate-400">
                  <span className="text-green-500 mr-1">✓</span>
                  {c.label}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}