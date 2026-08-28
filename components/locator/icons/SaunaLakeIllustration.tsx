import type { SVGProps } from "react";

// Cartoon sauna hut on the lake — chimney steam, a warm amber window, a
// faint reflection in the water. Its own small fixed palette (pale
// water/sand plus the one amber accent), not the dashboard's grayscale
// tokens: like LocationTypeBanner's photography, it's a self-contained
// graphic rather than dashboard chrome, so it doesn't need to invert for
// the dark theme (see app/globals.css).
export function SaunaLakeIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 420 220" role="img" aria-hidden {...props}>
      <rect x="0" y="150" width="420" height="70" fill="#EAF6FA" />
      <path
        d="M0 160 Q20 155 40 160 T80 160 T120 160 T160 160 T200 160 T240 160 T280 160 T320 160 T360 160 T400 160 T420 160"
        fill="none"
        stroke="#CFE9F2"
        strokeWidth="3"
      />
      <rect x="0" y="140" width="420" height="18" fill="#E3D9C8" />
      <g>
        <path d="M40 140 L52 100 L64 140 Z" fill="#0E2233" />
        <path d="M42 118 L52 88 L62 118 Z" fill="#0E2233" />
        <path d="M340 140 L352 105 L364 140 Z" fill="#0E2233" />
      </g>
      <g>
        <rect x="150" y="90" width="120" height="55" fill="#0E2233" />
        <polygon points="140,90 210,50 280,90" fill="#0E2233" />
        <rect x="180" y="115" width="24" height="30" fill="#F7F3EC" />
        <rect x="220" y="100" width="26" height="22" rx="2" fill="#F2B84B" />
        <rect x="220" y="100" width="26" height="22" rx="2" fill="none" stroke="#0E2233" strokeWidth="2" />
        <rect x="204" y="60" width="10" height="18" fill="#0E2233" />
      </g>
      <g fill="none" stroke="#F2B84B" strokeWidth="4" strokeLinecap="round" opacity="0.85">
        <path d="M209 58 Q200 46 209 36 Q218 26 209 14" />
        <path d="M222 58 Q231 48 222 38 Q213 28 222 18" />
      </g>
      <g opacity="0.18" transform="translate(0,300) scale(1,-1)">
        <rect x="150" y="155" width="120" height="45" fill="#0E2233" />
        <polygon points="140,155 210,190 280,155" fill="#0E2233" />
      </g>
    </svg>
  );
}
