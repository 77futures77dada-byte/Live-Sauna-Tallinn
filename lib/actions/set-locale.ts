"use server";

import { cookies } from "next/headers";
import { isLocale, localeCookieName, type Locale } from "@/lib/i18n";

const oneYearSeconds = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: Locale) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(localeCookieName, locale, { path: "/", maxAge: oneYearSeconds, sameSite: "lax" });
}
