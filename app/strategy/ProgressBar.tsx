export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-slate-900">
      <div
        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}