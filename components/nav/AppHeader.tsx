import Link from "next/link";
import { AssistantSheet } from "@/components/assistant/AssistantSheet";
import { getDictionary, type Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

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
    <header className="z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-base font-semibold">{dict.app.name}</h1>
      <div className="flex items-center gap-3">
        <AssistantSheet locale={locale} enabled={assistantEnabled} />
        <LanguageSwitcher locale={locale} />
        {isAdmin && (
          <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
            Admin
          </Link>
        )}
        {userEmail ? (
          <Link href="/profile" className="text-sm text-zinc-500 hover:underline">
            {userEmail}
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium underline">
            {dict.auth.login}
          </Link>
        )}
      </div>
    </header>
  );
}
