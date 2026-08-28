"use client";

import { Moon, Sun } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "theme";

// data-theme lives on <html>, set synchronously before hydration by the
// blocking script in app/layout.tsx. Deriving "which icon to show" from
// React state would either mismatch that server-rendered HTML (state
// starts at a guessed default) or need a setState call inside an effect
// (which cascading-render lint rejects) — so the swap is plain CSS
// instead, gated on the same attribute, no state involved.
export function ThemeToggle({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).theme;

  function toggle() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? "light" : "dark");
    } catch {
      // Private browsing / storage disabled — toggle still works this
      // session, it just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dict.toggle}
      title={dict.toggle}
      className="text-fjord transition-colors hover:text-steam"
    >
      <Moon className="h-4 w-4 [html[data-theme=dark]_&]:hidden" aria-hidden />
      <Sun className="hidden h-4 w-4 [html[data-theme=dark]_&]:block" aria-hidden />
    </button>
  );
}
