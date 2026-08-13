import { Flame } from "lucide-react";
import Link from "next/link";
import { AssistantSheet } from "@/components/assistant/AssistantSheet";
import { getDictionary, type Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

// The sidebar (desktop, lg+) carries its own larger "Live Sauna Tallinn"
// heading — this stays a compact wordmark so the two don't visually
// duplicate the same headline at the same size.
export function AppHeader({
  userEmail,
  isAdmin,
  locale,
  assistantEnabled,
}: {
  userEmail: string | null;
  isAdmin: boolean;
  locale: Locale;
  assistantEnabled: boolean;
}) {
  const dict = getDictionary(locale);

  return (
    <header className="z-10 flex items-center justify-between border-b border-warm-border bg-ivory px-4 py-3 text-fjord">
      <h1 className="flex items-center gap-1.5 font-display text-lg tracking-tight">
        <Flame className="h-4 w-4 text-ember" aria-hidden />
        {dict.app.name}
      </h1>
      <div className="flex items-center gap-3">
        <AssistantSheet locale={locale} enabled={assistantEnabled} />
        <LanguageSwitcher locale={locale} />
        {isAdmin && (
          <Link href="/admin" className="text-sm font-medium text-ember hover:underline">
            Admin
          </Link>
        )}
        {userEmail ? (
          <Link href="/profile" className="text-sm text-steam hover:underline">
            {userEmail}
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium text-ember hover:underline">
            {dict.auth.login}
          </Link>
        )}
      </div>
    </header>
  );
}
