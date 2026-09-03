"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { type ComponentType, type ReactNode, type SVGProps } from "react";
import {
  ArrowRight,
  Ban,
  Camera,
  Check,
  ChevronDown,
  CigaretteOff,
  Clock,
  Eye,
  Flame,
  Footprints,
  Shuffle,
  Snowflake,
  Trash2,
  UserCheck,
  Users,
  Waves,
} from "lucide-react";
import { FirewoodIcon } from "@/components/landing/icons/FirewoodIcon";
import { KeyDocumentIcon } from "@/components/landing/icons/KeyDocumentIcon";
import { WaterBottleIcon } from "@/components/landing/icons/WaterBottleIcon";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LiveSnapshot } from "@/lib/occupancy-status";
import type { Database } from "@/lib/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];

// react-leaflet touches browser globals at module eval, so the locator
// map is client-only — same pattern as MapScreen (see the bundled
// docs/app/guides/lazy-loading, "ssr: false is not allowed in Server
// Components"; fine here since this file is a Client Component).
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
});

// Landing-only colour system — "cold outside, warm inside". Frost Blue is
// the path / preparation / return; Ember is the fire, the löyly, the
// sauna itself, and the single call-to-action colour. These are scoped to
// this file on purpose: the in-app dashboard stays strictly monochrome
// (see app/globals.css), so nothing here goes through the Tailwind theme.
const FROST = "#3FA9D6";
const EMBER = "#E8632C";
const INK = "#0E2233";
const INK_MUTED = "#5B7385";
const ICE_BG = "#F0F9FC";
const LINE = "#DCE9EF";

type Tone = "frost" | "ember";
const toneColor = (tone: Tone) => (tone === "ember" ? EMBER : FROST);

// Real dusk photos of the Lake Harku floating sauna complex, shot on site
// (originals in public/harku-real/, re-encoded into public/atmosphere/).
// This is the actual pilot location now, so the caption below
// (dict.landing.galleryNote) says so plainly rather than flagging these as
// illustrative stand-ins.
const GALLERY: { src: string; icon: typeof Flame; tone: Tone }[] = [
  { src: "/atmosphere/hero.webp", icon: Flame, tone: "ember" },
  { src: "/atmosphere/sauna.webp", icon: Flame, tone: "ember" },
  { src: "/atmosphere/winter-swimming.webp", icon: Snowflake, tone: "frost" },
  { src: "/atmosphere/beach.webp", icon: Waves, tone: "frost" },
];

// Tone per rule, in the fixed order authored in i18n (which follows the
// official Haabersti rules document). "ember" = about the session, the
// fire, or the löyly itself; "frost" = getting there, conduct, leaving.
const RULE_TONES: Tone[] = [
  "frost", // keys from the guard
  "frost", // first-come, first-served
  "ember", // up to 4 people per session
  "ember", // session up to 3 hours
  "ember", // bring hardwood firewood
  "ember", // never leave the fire unattended
  "frost", // no smoking
  "ember", // only clean water on the stones
  "frost", // minors with an adult
  "frost", // no alcohol
  "frost", // clean up after yourself
];

// Custom illustrated icons for the three "what to bring" rules — the
// rest of the checklist keeps the plain Check glyph below. Keyed by
// index into `t.rules`, which follows the fixed order above.
const RULE_ILLUSTRATIONS: Record<
  number,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  0: KeyDocumentIcon, // keys from the guard, against an ID document
  4: FirewoodIcon, // bring hardwood firewood
  7: WaterBottleIcon, // only clean water on the stones
};

// Lucide glyphs for the remaining rules — same slot the plain Check
// fills, just a more legible pictogram. Keyed by index, same order.
const RULE_ICONS: Record<number, typeof Flame> = {
  1: Shuffle, // first-come, first-served
  2: Users, // up to 4 people
  3: Clock, // up to 3 hours
  5: Flame, // never leave the fire unattended
  6: CigaretteOff, // no smoking
  8: UserCheck, // minors with an adult
  9: Ban, // no alcohol
  10: Trash2, // clean up after yourself
};

function SectionHeading({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-6 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: toneColor(tone) }}
        aria-hidden
      />
      <h2
        className="font-display text-2xl font-bold sm:text-3xl"
        style={{ color: INK }}
      >
        {children}
      </h2>
    </div>
  );
}

// Full-screen splash before the dashboard, followed by scroll-down info
// sections (how it works / official rules / gallery / map). One colour
// story runs the whole length: the teal hero is the cold outside, the
// Ember CTA is the warm invitation in, the sections alternate frost/ember
// accents by meaning, and the closing map returns to Frost Blue. Scoped
// to this file — the app's monochrome interior is untouched. MapScreen
// renders this inside a `fixed inset-0` wrapper so it covers AppHeader's
// bar too; this screen owns its own corner logo/language chrome. The
// floating assistant button (AssistantSheet, portaled to <body> at
// z-1100) still sits on top.
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

  const steps: { title: string; body: string; tone: Tone }[] = [
    { title: t.howStep1Title, body: t.howStep1Body, tone: "frost" },
    { title: t.howStep2Title, body: t.howStep2Body, tone: "frost" },
    { title: t.howStep3Title, body: t.howStep3Body, tone: "ember" },
  ];

  // Quick-glance version of the same three steps, shown directly in the
  // hero so the gist is visible without scrolling. Deliberately shorter
  // than `steps` above — that's the detailed "Kuidas see käib" section.
  // Each step gets a photo circle (the same on-site Lake Harku shots as
  // the gallery section, cropped round) with the icon as a small badge on
  // top, rather than the icon being the only visual.
  const quickSteps: {
    icon: typeof Eye;
    image: string;
    label: string;
    shortLabel: string;
    tone: Tone;
  }[] = [
    {
      icon: Eye,
      image: "/atmosphere/winter-swimming.webp",
      label: t.quickStep1,
      shortLabel: t.quickStep1Short,
      tone: "frost",
    },
    {
      icon: Footprints,
      image: "/atmosphere/beach.webp",
      label: t.quickStep2,
      shortLabel: t.quickStep2Short,
      tone: "ember",
    },
    {
      icon: Camera,
      image: "/atmosphere/sauna.webp",
      label: t.quickStep3,
      shortLabel: t.quickStep3Short,
      tone: "ember",
    },
  ];

  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto bg-white">
      {/* ---------- Splash — cold outside ---------- */}
      <section
        className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-20 text-center"
        style={{
          background: "linear-gradient(155deg, #0e4a5c 0%, #3fa9d6 100%)",
        }}
      >
        <Snowflake
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-20 h-72 w-72 text-white/10 sm:h-80 sm:w-80"
          strokeWidth={1}
        />
        {/* Warm Ember glow behind the flame — the one hint of heat in the
            cold splash. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/4 -right-24 h-80 w-80 sm:h-96 sm:w-96"
          style={{
            background:
              "radial-gradient(circle, rgba(232,99,44,0.38) 0%, rgba(232,99,44,0) 70%)",
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
          <Flame className="h-6 w-6" style={{ color: EMBER }} aria-hidden />
        </div>
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
          <LanguageSwitcher locale={locale} variant="pill" />
        </div>

        <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center">
          <div className="flex max-w-2xl flex-col items-center">
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
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: EMBER }}
                />
                <span
                  className="relative inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: EMBER }}
                />
              </span>
              <span className="text-base font-semibold text-white sm:text-lg">
                {liveText}
              </span>
            </div>

            {/* Ember CTA — the warm invitation to step inside. */}
            <button
              type="button"
              onClick={onEnter}
              style={{
                backgroundColor: EMBER,
                boxShadow: "0 12px 28px -8px rgba(232,99,44,0.55)",
              }}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white transition hover:brightness-95"
            >
              {dict.hero.viewMap}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>

            {/* Mobile quick-glance row — a compact, one-screen hint of the
              process. Desktop shows the fuller glass panel instead
              (see below), so this is hidden at lg. Each item fades/scales
              in on mount (which for this row means "as soon as it's on
              screen", since it never requires scrolling) — staggered
              slightly per step for a little life without being busy. */}
            <div className="mt-6 flex items-start justify-center gap-5 lg:hidden">
              {quickSteps.map(
                ({ icon: Icon, image, shortLabel, tone }, index) => (
                  <div
                    key={shortLabel}
                    className="flex w-20 animate-[quick-step-enter_500ms_ease-out_both] flex-col items-center gap-1.5"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white/40">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="48px"
                        style={{ objectFit: "cover" }}
                      />
                      <span
                        className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-white/80"
                        style={{ backgroundColor: toneColor(tone) }}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                      </span>
                    </span>
                    <span className="text-center text-[11px] leading-tight font-medium text-white/90">
                      {shortLabel}
                    </span>
                  </div>
                ),
              )}
            </div>

            {!userId && (
              <Link
                href="/login"
                className="mt-6 text-xs font-medium text-white/80 underline-offset-2 transition hover:text-white hover:underline"
              >
                {dict.hero.login}
              </Link>
            )}
          </div>

          {/* Desktop quick-glance panel — a compact glass card next to the
            hero copy so the gist is visible without scrolling. Hidden
            below lg, where the row above takes over. Each row gets a
            subtle hover lift (translate + a slow zoom on the photo) —
            a hover-only echo of the mobile row's on-appear animation,
            since hover isn't available on touch. */}
          <div className="hidden shrink-0 flex-col gap-5 rounded-3xl border border-white/25 bg-white/15 p-6 text-left shadow-xl backdrop-blur-xl lg:flex lg:w-72 xl:w-80">
            {quickSteps.map(({ icon: Icon, image, label, tone }) => (
              <div
                key={label}
                className="group flex items-center gap-4 rounded-2xl transition-transform duration-300 ease-out hover:-translate-y-0.5"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white/40 transition duration-300 group-hover:ring-white/70">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="56px"
                    style={{ objectFit: "cover" }}
                    className="transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                  <span
                    className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-white/80"
                    style={{ backgroundColor: toneColor(tone) }}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </span>
                <span className="text-sm font-semibold text-white">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <a
          href="#how"
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs font-medium text-white/80 transition hover:text-white"
        >
          {t.scrollHint}
          <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden />
        </a>
      </section>

      {/* ---------- How it works — the path in (frost) ---------- */}
      <section
        id="how"
        className="mx-auto max-w-4xl scroll-mt-6 px-6 py-16 sm:py-20"
      >
        <SectionHeading tone="frost">{t.howTitle}</SectionHeading>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-semibold text-white"
                style={{ backgroundColor: toneColor(step.tone) }}
              >
                {index + 1}
              </span>
              <h3
                className="font-display text-base font-semibold"
                style={{ color: INK }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: INK_MUTED }}
              >
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Official rules — inside the sauna (ember) ---------- */}
      <section
        className="border-y"
        style={{ backgroundColor: ICE_BG, borderColor: LINE }}
      >
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <SectionHeading tone="ember">{t.rulesTitle}</SectionHeading>
          <p
            className="mt-3 max-w-2xl text-sm leading-relaxed"
            style={{ color: INK_MUTED }}
          >
            {t.rulesIntro}
          </p>

          <p
            className="mt-5 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold"
            style={{ borderColor: LINE, color: INK }}
          >
            <Clock className="h-4 w-4" style={{ color: FROST }} aria-hidden />
            {t.rulesSeason}
          </p>

          <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {t.rules.map((rule, index) => {
              const Illustration = RULE_ILLUSTRATIONS[index];
              const RuleIcon = RULE_ICONS[index];
              return (
                <li
                  key={rule}
                  className="flex items-center gap-3 text-sm leading-relaxed sm:items-start"
                  style={{ color: INK }}
                >
                  {Illustration ? (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                      <Illustration
                        className="h-8 w-auto max-w-full"
                        aria-hidden
                      />
                    </span>
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center sm:h-auto sm:items-start sm:pt-0.5">
                      {RuleIcon ? (
                        <RuleIcon
                          className="h-4 w-4"
                          style={{
                            color: toneColor(RULE_TONES[index] ?? "frost"),
                          }}
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : (
                        <Check
                          className="h-4 w-4"
                          style={{
                            color: toneColor(RULE_TONES[index] ?? "frost"),
                          }}
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      )}
                    </span>
                  )}
                  {rule}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------- Gallery — the warm interior (ember) ---------- */}
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <SectionHeading tone="ember">{t.galleryTitle}</SectionHeading>
        <p
          className="mt-3 max-w-2xl text-sm leading-relaxed"
          style={{ color: INK_MUTED }}
        >
          {t.galleryNote}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {GALLERY.map(({ src, icon: Icon, tone }) => (
            <div
              key={src}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border"
              style={{ borderColor: LINE, backgroundColor: ICE_BG }}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                style={{ objectFit: "cover" }}
              />
              <span
                className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow"
                style={{ backgroundColor: toneColor(tone) }}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Locator map — back to the cold (frost) ---------- */}
      {site && (
        <section
          className="border-t-[3px]"
          style={{ backgroundColor: ICE_BG, borderColor: FROST }}
        >
          <div className="mx-auto max-w-4xl px-6 py-16 pb-28 sm:py-20 sm:pb-28">
            <SectionHeading tone="frost">{t.mapTitle}</SectionHeading>
            <p className="mt-3 text-sm" style={{ color: INK_MUTED }}>
              {t.mapNote}
            </p>
            <div
              className="mt-6 h-72 w-full overflow-hidden rounded-2xl border shadow-sm sm:h-96"
              style={{ borderColor: LINE }}
            >
              <MapView site={site} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
