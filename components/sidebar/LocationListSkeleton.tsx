// Placeholder shape for the sidebar's location list, shown only in
// MapScreen's Suspense fallback while the map's JS chunk streams in — so
// the two-column layout doesn't pop in asymmetrically (list first, map
// blank) on a slow connection or cold cache.
export function LocationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-warm-border bg-white p-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 shrink-0 rounded-full bg-steam/15" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className="block h-3.5 w-3/5 rounded bg-steam/15" />
              <span className="block h-2.5 w-2/5 rounded bg-steam/10" />
            </div>
          </div>
          <span className="mt-3 block h-2.5 w-1/3 rounded bg-steam/10" />
        </div>
      ))}
    </div>
  );
}
