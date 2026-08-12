import en from "@/i18n/en.json";
import et from "@/i18n/et.json";
import ru from "@/i18n/ru.json";

export const locales = ["et", "ru", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "et";
export const localeCookieName = "NEXT_LOCALE";

const dictionaries: Record<Locale, typeof en> = { en, et, ru };

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
