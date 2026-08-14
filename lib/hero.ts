// No real photography of the location exists yet — HeroBackground renders
// a stylized gradient (see components/landing/HeroBackground.tsx) until an
// actual photo is available. Set HERO_IMAGE_URL to switch it over; nothing
// else needs to change.
export function getHeroImageUrl(): string | null {
  return process.env.HERO_IMAGE_URL || null;
}
