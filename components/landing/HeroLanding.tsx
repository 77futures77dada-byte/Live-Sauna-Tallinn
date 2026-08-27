"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Check, ChevronDown, Clock, Flame, Snowflake, Waves } from "lucide-react";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LiveSnapshot } from "@/lib/occupancy-status";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// react-leaflet touches browser globals at module eval, so the locator
// map is client-only — same pattern as MapScreen (see the bundled
// docs/app/guides/lazy-loading, "ssr: false is not allowed in Server
// Components"; fine here since this file is a Client Component).
const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

// Temporary stand-in imagery until the client hands over real Lake Harku
// photos — deliberately the stylised atmosphere shots already licensed
// for the app, shown under an honest "not this exact site" caption
// (dict.landing.galleryNote), never passed off as the real location.
const GALLERY = [
  { src: "/atmosphere/sauna.webp", icon: Flame },
  { src: "/atmosphere/winter-swimming.webp", icon: Snowflake },
  { src: "/atmosphere/beach.webp", icon: Waves },
] as const;

// Full-screen splash before the dashboard, followed by scroll-down
// info sections (how it works / official rules / gallery / map). The
// splash keeps a soft Frost Blue accent as a warmer first impression,
// scoped to this file only — the sections below match the app's strict
// monochrome interior. MapScreen renders this inside a `fixed inset-0`
// wrapper so it covers AppHeader's bar too; this screen owns its own
// corner logo/language chrome. The floating assistant button
// (AssistantSheet, portaled to <body> at z-1100) still sits on top.
export function HeroLanding({
  locale,
  onEnter,
  userId,
  liveSnapshot,
  site,
}: {
  locale: Locale;
  onEnter: () => void;
  userId: string | null;
  liveSnapshot: LiveSnapshot;
  site: Location | null;
}) {
  const dict = getDictionary(locale);
  const t = dict.landing;

  const liveText =
    liveSnapshot.activeLocations > 0
      ? t.liveActive
          .replace("{locations}", String(liveSnapshot.activeLocations))
          .replace("{people}", String(liveSnapshot.peopleCount))
      : t.liveIdle;

  const steps = [
    { title: t.howStep1Title, body: t.howStep1Body },
    { title: t.howStep2Title, body: t.howStep2Body },
    { title: t.howStep3Title, body: t.howStep3Body },
  ];

  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto bg-white">
      {/* ---------- Splash ---------- */}
      <section
        className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-20 text-center"
        style={{ background: "linear-gradient(155deg, #0e4a5c 0%, #3fa9d6 100%)" }}
      >
        <Snowflake
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-20 h-72 w-72 text-white/10 sm:h-80 sm:w-80"
          strokeWidth={1}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/4 -right-24 h-80 w-80 sm:h-96 sm:w-96"
          style={{
            background:
              "radial-gradient(circle, rgba(242,184,75,0.35) 0%, rgba(242,184,75,0) 70%)",
            filter: "blur(24px)",
          }}
        />
        <Flame
          aria-hidden
          className="pointer-events-none absolute top-1/4 -right-24 h-80 w-80 text-white/10 sm:h-96 sm:w-96"
          strokeWidth={1}
        />
        <Waves
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-1/5 h-64 w-64 text-white/10 sm:h-72 sm:w-72"
          strokeWidth={1}
        />

        <div className="absolute top-5 left-5 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg sm:top-6 sm:left-6">
          <Flame className="h-6 w-6 text-fjord" aria-hidden />
        </div>
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
          <LanguageSwitcher locale={locale} variant="pill" />
        </div>

        <div className="relative z-10 flex max-w-2xl flex-col items-center">
          <span className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-white uppercase ring-1 ring-white/25 backdrop-blur-sm">
            {t.freeBadge}
          </span>

          <h1 className="mt-6 text-4xl leading-[1.05] font-extrabold tracking-tight text-white sm:text-6xl">
            {t.headline}
          </h1>

          <p className="mt-5 max-w-lg text-base font-medium text-white sm:text-lg">
            {t.subheadline}
          </p>

          {/* Live status — a real element on the splash, not a footnote.
              Honest fallback (t.liveIdle) when nothing is active; never
              invents a free/busy status the data doesn't carry. */}
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-5 py-3.5 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="text-base font-semibold text-white sm:text-lg">{liveText}</span>
          </div>

          <button
            type="button"
            onClick={onEnter}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-fjord shadow-lg transition hover:brightness-95"
          >
            {dict.hero.viewMap}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          {!userId && (
            <Link
              href="/login"
              className="mt-6 text-xs font-medium text-white/80 underline-offset-2 transition hover:text-white hover:underline"
            >
              {dict.hero.login}
            </Link>
          )}
        </div>

        <a
          href="#how"
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs font-medium text-white/80 transition hover:text-white"
        >
          {t.scrollHint}
          <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden />
        </a>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto max-w-4xl scroll-mt-6 px-6 py-16 sm:py-20">
        <h2 className="font-display text-2xl font-bold text-fjord sm:text-3xl">{t.howTitle}</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fjord font-display text-base font-semibold text-ivory">
                {index + 1}
              </span>
              <h3 className="font-display text-base font-semibold text-fjord">{step.title}</h3>
              <p className="text-sm leading-relaxed text-steam">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Official rules ---------- */}
      <section className="border-y border-warm-border bg-ivory-shade">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <h2 className="font-display text-2xl font-bold text-fjord sm:text-3xl">{t.rulesTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-steam">{t.rulesIntro}</p>

          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-warm-border bg-white px-4 py-2 text-sm font-semibold text-fjord">
            <Clock className="h-4 w-4" aria-hidden />
            {t.rulesSeason}
          </p>

          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {t.rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2.5 text-sm leading-relaxed text-fjord">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-steam" strokeWidth={2.5} aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Gallery ---------- */}
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <h2 className="font-display text-2xl font-bold text-fjord sm:text-3xl">{t.galleryTitle}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-steam">{t.galleryNote}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {GALLERY.map(({ src, icon: Icon }) => (
            <div
              key={src}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-warm-border bg-ivory-shade"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                style={{ objectFit: "cover" }}
              />
              <Icon
                className="absolute bottom-2 left-2 h-4 w-4 text-white drop-shadow"
                aria-hidden
              />
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Locator map ---------- */}
      {site && (
        <section className="border-t border-warm-border bg-ivory-shade">
          <div className="mx-auto max-w-4xl px-6 py-16 pb-28 sm:py-20 sm:pb-28">
            <h2 className="font-display text-2xl font-bold text-fjord sm:text-3xl">{t.mapTitle}</h2>
            <p className="mt-3 text-sm text-steam">{t.mapNote}</p>
            <div className="mt-6 h-72 w-full overflow-hidden rounded-2xl border border-warm-border shadow-sm sm:h-96">
              <MapView site={site} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
