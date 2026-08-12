"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

interface AssistantLocation {
  slug: string;
  name: string;
}

interface AssistantMessage {
  id: number;
  role: "user" | "assistant" | "error";
  text: string;
  location?: AssistantLocation | null;
}

// Resolves with coordinates if the visitor grants permission, null for
// every other case (denied, unsupported, timed out) — never throws, so a
// query that doesn't strictly need location can't be blocked by it.
// Calling getCurrentPosition is itself what triggers the browser's
// permission prompt the first time, satisfying "ask explicitly, only
// when not already asked" without any separate detection step.
function getBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timeout = setTimeout(() => resolve(null), 5000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => {
        clearTimeout(timeout);
        resolve(null);
      },
      { timeout: 5000, maximumAge: 5 * 60_000 },
    );
  });
}

export function AssistantSheet({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const dict = getDictionary(locale).assistant;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(query: string) {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const coords = await getBrowserLocation();
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId.current++,
            role: "error",
            text: typeof data.error === "string" ? data.error : dict.genericError,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "assistant", text: data.answer, location: data.location ?? null },
      ]);
    } catch {
      setMessages((prev) => [...prev, { id: nextId.current++, role: "error", text: dict.networkError }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  const examples = [dict.examplesLeastCrowded, dict.examplesColdestWater, dict.examplesNearestSauna];

  return (
    <>
      <button
        type="button"
        onClick={() => enabled && setOpen(true)}
        disabled={!enabled}
        aria-label={dict.openLabel}
        title={enabled ? dict.openLabel : dict.unavailable}
        className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={dict.close}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1300] bg-black/30 sm:bg-transparent"
          />
          <div className="fixed inset-x-0 bottom-0 z-[1301] flex max-h-[75vh] min-h-[50vh] flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900 sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-auto sm:h-[32rem] sm:w-96 sm:rounded-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 p-4 dark:border-zinc-800">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4" aria-hidden />
                {dict.title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                aria-label={dict.close}
              >
                ✕
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-500">{dict.greeting}</p>
                  <div className="flex flex-col items-start gap-1.5">
                    {examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => ask(example)}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[85%] rounded-2xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : message.role === "error"
                          ? "max-w-[85%] rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
                          : "max-w-[85%] rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    }
                  >
                    <p>{message.text}</p>
                    {message.location && (
                      <Link
                        href={`/location/${message.location.slug}`}
                        className="mt-1.5 inline-block text-xs font-medium underline"
                      >
                        {dict.showOnMap}
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {loading && <p className="text-sm text-zinc-400">{dict.thinking}</p>}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800"
            >
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={dict.placeholder}
                maxLength={500}
                disabled={loading}
                className="flex-1 rounded-full border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-transparent"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {dict.send}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
