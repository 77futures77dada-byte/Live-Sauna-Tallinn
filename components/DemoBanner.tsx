// Permanent, non-dismissable marker shown whenever the app is running on
// test data (isDemoMode() — lib/demo.ts). Deliberately loud: a government
// client must never mistake a demo for real statistics. z-index clears
// Leaflet's panes (~1000), the location card (1201) and the hero splash
// (z-50). Paired with a `pt` on <body> in app/layout.tsx so it doesn't
// cover the header.
export function DemoBanner() {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[2000] flex h-8 items-center justify-center gap-2 bg-amber-400 px-3 text-center text-[11px] font-bold tracking-wide text-black uppercase sm:text-xs"
    >
      <span aria-hidden>⚠</span>
      DEMO · TESTANDMED — näidisandmed, mitte päris statistika
    </div>
  );
}
