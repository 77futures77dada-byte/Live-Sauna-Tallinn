import Image from "next/image";

// Licensed stock photography (see public/atmosphere/), not the previous
// gradient placeholder. HeroLanding's text is dark-on-light (Fjord Ink on
// Ivory, matching the rest of the light theme — see HeroLanding), so the
// overlay is a light Ivory wash, not a dark scrim: it needs to keep the
// photo present but knock it back enough for dark text to stay readable.
export function HeroBackground() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <Image
        src="/atmosphere/hero.webp"
        alt=""
        fill
        sizes="100vw"
        preload
        style={{ objectFit: "cover" }}
      />
      <div className="absolute inset-0 bg-[#F7F3EC]/78" />
    </div>
  );
}
