// Same fire-and-ice language as LocationTypeBanner (see
// components/location/LocationTypeBanner.tsx): a warm ember glow and a
// cool frost glow over the dark fjord base, meeting in the middle. This is
// an interim stand-in for real location photography, so it's deliberately
// a flat, honest gradient rather than anything trying to read as a photo
// (no noise/texture pass). Once a real photo exists, set HERO_IMAGE_URL
// (see lib/hero.ts) and this component switches over automatically.
const EMBER_FROST_GRADIENT = `
  radial-gradient(120% 100% at 12% 90%, rgba(232, 99, 44, 0.55) 0%, rgba(232, 99, 44, 0) 55%),
  radial-gradient(120% 100% at 88% 8%, rgba(63, 169, 214, 0.45) 0%, rgba(63, 169, 214, 0) 55%),
  #0E2233
`;

export function HeroBackground({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <div className="absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary
            external URL from config, not a known image domain */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#0E2233]/55" />
      </div>
    );
  }

  return <div className="absolute inset-0" style={{ background: EMBER_FROST_GRADIENT }} aria-hidden />;
}
