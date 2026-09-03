import { Camera, KeyRound, Users } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";

// Static "how to get a spot" explainer for the dashboard — mirrors the
// client's mockup (screen 2). Deliberately not tied to live data: it's the
// standing procedure, the same every day. The queue itself (join / groups
// ahead / wait) is a separate, live block — see QueueStatus.
//
// Step wording is kept consistent with the official rules already in
// i18n (landing.rules): the key comes from the on-site guard ("valvur")
// against an ID document.
const STEP_ICONS = [Users, Camera, KeyRound] as const;

export function HowToGetIn({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).howToGetIn;
  const steps = [t.step1, t.step2, t.step3];

  return (
    <section className="mt-6 rounded-3xl border border-warm-border bg-ivory p-4 shadow-sm sm:p-5">
      <h2 className="font-display text-sm font-semibold text-fjord">{t.title}</h2>

      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[index];
          return (
            <li key={step} className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lake-soft text-lake">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-sm leading-snug text-steam">
                <span className="font-semibold text-fjord">{index + 1}.</span> {step}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-warm-border pt-3 text-xs leading-relaxed text-steam">
        {t.disclaimer}
      </p>
    </section>
  );
}
