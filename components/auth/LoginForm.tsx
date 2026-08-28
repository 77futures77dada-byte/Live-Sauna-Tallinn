"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";
type Status = "idle" | "sending" | "sent" | "verifying" | "error" | "codeError";

// Google-only login for the client demo — OTP stays fully wired (Supabase
// still handles it below) behind this flag so it can go back into the UI
// with a one-line flip, not a rebuild.
const EMAIL_LOGIN_ENABLED = false;

export function LoginForm({
  locale,
  initialError = false,
}: {
  locale: Locale;
  initialError?: boolean;
}) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>(initialError ? "error" : "idle");

  async function sendCode(event: React.SyntheticEvent) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setStatus("error");
      return;
    }
    setStatus("sent");
    setStep("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setStatus("verifying");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("codeError");
      return;
    }
    router.push("/");
    router.refresh();
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

      {step === "email" && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            className="rounded-full border border-black/[.08] px-5 py-3 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
          >
            {dict.auth.continueWithGoogle}
          </button>

          {EMAIL_LOGIN_ENABLED && (
            <>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                {dict.auth.or}
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <form onSubmit={sendCode} className="flex flex-col gap-3">
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
                  {status === "sending" ? dict.auth.sending : dict.auth.sendCode}
                </button>
              </form>

              {status === "error" && (
                <p className="text-sm text-red-600">{dict.auth.loginError}</p>
              )}
            </>
          )}
        </>
      )}

      {EMAIL_LOGIN_ENABLED && step === "code" && (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {dict.auth.checkInbox} <span className="font-medium text-foreground">{email}</span>
          </p>

          <form onSubmit={verifyCode} className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder={dict.auth.codePlaceholder}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="rounded-full border border-black/[.08] px-4 py-3 text-center text-lg tracking-[0.3em] dark:border-white/[.145] dark:bg-transparent"
            />
            <button
              type="submit"
              disabled={status === "verifying"}
              className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-50"
            >
              {status === "verifying" ? dict.auth.verifying : dict.auth.verify}
            </button>
          </form>

          {status === "codeError" && (
            <p className="text-sm text-red-600">{dict.auth.codeError}</p>
          )}

          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setStatus("idle");
              }}
              className="text-zinc-500 hover:underline"
            >
              {dict.auth.changeEmail}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={status === "sending"}
              className="text-zinc-500 hover:underline disabled:opacity-50"
            >
              {dict.auth.resendCode}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
