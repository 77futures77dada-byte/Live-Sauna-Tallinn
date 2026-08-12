import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName, type Locale } from "@/lib/i18n";

// Server-only (next/headers) — kept out of lib/i18n.ts so that file can
// still be imported from Client Components without pulling in a
// server-only dependency.
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}
