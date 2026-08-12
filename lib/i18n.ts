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

// BCP-47 tags for Date#toLocaleString/toLocaleTimeString — passing the
// selected locale explicitly instead of `[]` (browser default) so a
// Russian-language visitor on an English-language browser still sees
// Russian-formatted dates, not a mix of the two.
export const bcp47Locale: Record<Locale, string> = {
  et: "et-EE",
  ru: "ru-RU",
  en: "en-GB",
};
