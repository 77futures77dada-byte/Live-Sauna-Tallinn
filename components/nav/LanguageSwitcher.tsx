"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/lib/actions/set-locale";
import { getDictionary, locales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  variant = "text",
}: {
  locale: Locale;
  // "pill" is HeroLanding's splash-screen look (a white segmented pill
  // over a colored background) — visually distinct enough from the
  // header's plain text links that it's a separate render path here
  // rather than a class-swap, but shares the same select()/setLocaleAction
  // wiring so both stay in sync with the same server-set-cookie flow.
  variant?: "text" | "pill";
}) {
  const [isPending, startTransition] = useTransition();
  const dict = getDictionary(locale);

  function select(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(() => {
      setLocaleAction(next);
    });
  }

  if (variant === "pill") {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-sm">
        {locales.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => select(loc)}
            aria-pressed={loc === locale}
            aria-label={dict.switcher[loc]}
            className={
              loc === locale
                ? "rounded-full bg-white px-3 py-1 text-xs font-semibold text-fjord"
                : "rounded-full px-3 py-1 text-xs font-medium text-white/75 transition-colors hover:text-white"
            }
          >
            {loc.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      {locales.map((loc, index) => (
        <span key={loc} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => select(loc)}
            aria-pressed={loc === locale}
            aria-label={dict.switcher[loc]}
            className={
              loc === locale
                ? "font-semibold text-fjord transition-colors"
                : "text-steam transition-colors hover:underline"
            }
          >
            <span className="sm:hidden">{loc.toUpperCase()}</span>
            <span className="hidden sm:inline">{dict.switcher[loc]}</span>
          </button>
          {index < locales.length - 1 && (
            <span className="text-warm-border" aria-hidden>
              /
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
