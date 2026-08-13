"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/lib/actions/set-locale";
import { getDictionary, locales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [isPending, startTransition] = useTransition();
  const dict = getDictionary(locale);

  function select(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(() => {
      setLocaleAction(next);
    });
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      {locales.map((loc, index) => (
        <span key={loc} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => select(loc)}
            aria-pressed={loc === locale}
            className={
              loc === locale
                ? "font-semibold text-[#E8632C]"
                : "text-[#7C93A0] hover:underline"
            }
          >
            {dict.switcher[loc]}
          </button>
          {index < locales.length - 1 && (
            <span className="text-[#D9CFBC]" aria-hidden>
              /
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
