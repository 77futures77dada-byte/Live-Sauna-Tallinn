import { SearchX } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";

export function LocationListEmptyState({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).sidebar;

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-warm-border px-4 py-10 text-center">
      <SearchX className="h-6 w-6 text-steam" aria-hidden />
      <p className="text-sm font-medium text-fjord">{dict.emptyTitle}</p>
      <p className="max-w-[26ch] text-xs text-steam">{dict.emptyHint}</p>
    </div>
  );
}
