"use client";

import { useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">{dict.auth.login}</h1>

      <button
        type="button"
        onClick={handleGoogle}
        className="rounded-full border border-black/[.08] px-5 py-3 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
      >
        {dict.auth.continueWithGoogle}
      </button>

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        {dict.auth.or}
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder={dict.auth.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-full border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145] dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-50"
        >
          {status === "sending" ? dict.auth.sending : dict.auth.sendMagicLink}
        </button>
      </form>

      {status === "sent" && (
        <p className="text-sm text-emerald-600">{dict.auth.checkInbox}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">{dict.auth.loginError}</p>
      )}
    </main>
  );
}
