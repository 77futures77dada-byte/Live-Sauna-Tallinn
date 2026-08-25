"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { getBrowserLocation } from "@/lib/geolocation";
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

// "Is this the client" without an effect (setState-in-effect is a lint
// error here) — never notifies, since client-ness can't change after the
// first render, so getSnapshot only ever needs to be read once more after
// getServerSnapshot's initial "no" during hydration.
function subscribeNever() {
  return () => {};
}

// Matches the exit CSS animation duration below — the panel stays
// mounted (and `open` stays true) for this long after a close request so
// the animation has time to actually play instead of the element just
// vanishing.
const CLOSE_ANIMATION_MS = 180;

export function AssistantSheet({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const dict = getDictionary(locale).assistant;
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Portal target only exists on the client — see the render below for why
  // this is portaled at all.
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
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

  function requestClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_ANIMATION_MS);
  }

  // Not mounted yet (SSR / first client render, before the useEffect above
  // fires) means no `document` to portal into — render nothing rather than
  // in place, to avoid a one-frame flash at the wrong DOM position.
  if (!mounted) return null;

  return createPortal(
    <>
      {/*
        Portaled straight onto <body> — not a DOM-position fix (AppHeader
        already mounts this once, shared by hero and map alike) but a
        paint one: even with z-[1100] clearing Leaflet's z-index ceiling
        of 1000 on paper, the button was getting hidden behind the tile
        layer once a map actually mounted, despite DOM inspection showing
        it topmost and correctly styled — a compositing quirk from
        Leaflet's transformed, GPU-layered panes, not a stacking value bug.
        Painting last, immune to any ancestor's stacking context, sidesteps
        it. z-[1100] itself still matters: it clears Leaflet (1000) while
        staying below the LocationCard sheet (z-[1201]) and this panel's
        own backdrop (z-[1300]), so it disappears behind either instead of
        floating over them on mobile, where both span the full width.
      */}
      {!open && (
        <button
          type="button"
          onClick={() => enabled && setOpen(true)}
          disabled={!enabled}
          aria-label={dict.openLabel}
          title={enabled ? dict.openLabel : dict.unavailable}
          className="fixed right-4 bottom-4 z-[1100] flex h-14 w-14 items-center justify-center rounded-full bg-fjord text-ivory shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-6 w-6" aria-hidden />
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            aria-label={dict.close}
            onClick={requestClose}
            className={`fixed inset-0 z-[1300] bg-black/30 lg:bg-transparent ${
              closing ? "animate-[backdrop-exit_180ms_ease-in_forwards]" : "animate-[backdrop-enter_200ms_ease-out]"
            }`}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-[1301] flex max-h-[85vh] min-h-[50vh] flex-col rounded-t-2xl bg-white shadow-2xl lg:inset-x-auto lg:top-20 lg:right-4 lg:bottom-auto lg:h-[32rem] lg:w-96 lg:rounded-2xl ${
              closing ? "animate-[panel-exit_180ms_ease-in_forwards]" : "animate-[panel-enter_220ms_ease-out]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-warm-border p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-fjord">
                <Sparkles className="h-4 w-4 text-fjord" aria-hidden />
                {dict.title}
              </h2>
              <button
                type="button"
                onClick={requestClose}
                className="rounded-full p-1 text-steam transition-colors hover:bg-ivory hover:text-fjord"
                aria-label={dict.close}
              >
                ✕
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-steam">{dict.greeting}</p>
                  <div className="flex flex-col items-start gap-1.5">
                    {examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => ask(example)}
                        className="rounded-full border border-warm-border px-3 py-1.5 text-left text-xs text-steam transition-colors hover:bg-ivory"
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
                        ? "max-w-[85%] rounded-2xl bg-fjord px-3 py-2 text-sm text-white"
                        : message.role === "error"
                          ? "max-w-[85%] rounded-2xl bg-busy/10 px-3 py-2 text-sm text-busy"
                          : "max-w-[85%] rounded-2xl bg-ivory px-3 py-2 text-sm text-fjord"
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

              {loading && <p className="text-sm text-steam">{dict.thinking}</p>}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-warm-border p-3"
            >
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={dict.placeholder}
                maxLength={500}
                disabled={loading}
                className="flex-1 rounded-full border border-warm-border px-3 py-1.5 text-sm text-fjord"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-fjord px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {dict.send}
              </button>
            </form>
          </div>
        </>
      )}
    </>,
    document.body,
  );
}
