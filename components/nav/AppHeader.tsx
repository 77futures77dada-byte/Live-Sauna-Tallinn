import { Flame, Shield, User } from "lucide-react";
import Link from "next/link";
import { AssistantSheet } from "@/components/assistant/AssistantSheet";
import { getDictionary, type Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Below `sm` (640px), Admin/profile collapse to icon-only links and the
// language switcher shows 2-letter codes instead of full names — at
// "Eesti / Русский / English" plus the title, the row didn't fit one line
// at 375-430px and wrapped to two, which was tall enough to cover map
// markers near the top edge (see the Phase 2 mobile bug report). One line,
// always, is the actual fix; the icon/abbreviation swap is just how it
// stays legible while shrinking.
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
    <header className="z-10 flex items-center justify-between gap-2 border-b border-warm-border bg-ivory px-3 py-2.5 text-fjord sm:px-4 sm:py-3">
      <h1 className="flex min-w-0 items-center gap-1.5 truncate font-display text-base leading-tight font-semibold tracking-tight sm:text-lg">
        <Flame className="h-4 w-4 shrink-0 text-ember" aria-hidden />
        {dict.app.name}
      </h1>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <AssistantSheet locale={locale} enabled={assistantEnabled} />
        <LanguageSwitcher locale={locale} />
        {isAdmin && (
          <Link
            href="/admin"
            className="text-ember transition-colors hover:underline"
            aria-label="Admin"
          >
            <Shield className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="hidden text-sm font-medium sm:inline">Admin</span>
          </Link>
        )}
        {userEmail ? (
          <Link
            href="/profile"
            className="text-steam transition-colors hover:underline"
            aria-label={userEmail}
          >
            <User className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="hidden max-w-[10rem] truncate text-sm sm:inline">{userEmail}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium whitespace-nowrap text-ember transition-colors hover:underline"
          >
            {dict.auth.login}
          </Link>
        )}
      </div>
    </header>
  );
}
