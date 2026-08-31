import { cookies } from "next/headers";

// Server-only (next/headers). Demo mode is on when either the `demo`
// cookie is set (toggled via ?demo=1 in proxy.ts) or the deploy is a
// dedicated demo/preview build (NEXT_PUBLIC_DEMO_MODE=1). When on, the
// app renders a permanent "DEMO / TESTANDMED" banner so test data is
// never mistaken for real municipal statistics — see components/DemoBanner.
export async function isDemoMode(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") return true;
  const store = await cookies();
  return store.get("demo")?.value === "1";
}
