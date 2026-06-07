export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-stone-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
        <span>{label ?? "Loading…"}</span>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-2">
      <div className="mb-2 h-3 w-32 animate-pulse rounded bg-stone-100" />
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid gap-2 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, j) => (
              <div key={j} className="h-3 animate-pulse rounded bg-stone-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
