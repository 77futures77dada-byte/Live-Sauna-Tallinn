import type { SVGProps } from "react";

// Cartoon night scene on the lake — three sauna huts with warm amber
// windows, chimney steam, a walker heading over, a crescent moon and
// stars, snow-dusted pines, a little jetty, and a faint reflection in
// the water. Its own small fixed palette (pale water/sand, ink, cream
// snow, plus the one amber accent), not the dashboard's grayscale
// tokens: it's a self-contained graphic rather than dashboard chrome,
// so it doesn't need to invert for the dark theme — the banner sits it
// in its own fixed-light card instead (see LocatorHeroBanner).
export function SaunaLakeIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 480 240" role="img" aria-hidden {...props}>
      <circle cx="380" cy="30" r="14" fill="#F2B84B" opacity="0.85" />
      <g fill="#F2B84B" opacity="0.6">
        <circle cx="40" cy="20" r="2" />
        <circle cx="90" cy="40" r="1.6" />
        <circle cx="380" cy="60" r="1.6" />
        <circle cx="150" cy="15" r="1.6" />
      </g>
      <rect x="0" y="170" width="480" height="70" fill="#EAF6FA" />
      <path
        d="M0 180 Q20 175 40 180 T80 180 T120 180 T160 180 T200 180 T240 180 T280 180 T320 180 T360 180 T400 180 T440 180 T480 180"
        fill="none"
        stroke="#CFE9F2"
        strokeWidth="3"
      />
      <rect x="0" y="160" width="480" height="18" fill="#E3D9C8" />
      <g stroke="#0E2233" strokeWidth="4" strokeLinecap="round">
        <line x1="380" y1="178" x2="440" y2="178" />
        <line x1="390" y1="178" x2="390" y2="192" />
        <line x1="430" y1="178" x2="430" y2="192" />
      </g>
      <g fill="#0E2233">
        <path d="M20 160 L32 122 L44 160 Z" />
        <path d="M22 138 L32 110 L42 138 Z" />
        <path d="M440 160 L452 128 L464 160 Z" />
      </g>
      <g>
        <rect x="70" y="128" width="46" height="32" fill="#0E2233" opacity="0.85" />
        <polygon points="65,128 93,108 121,128" fill="#0E2233" opacity="0.85" />
        <rect x="86" y="142" width="14" height="18" fill="#F2B84B" opacity="0.9" />
      </g>
      <g>
        <rect x="330" y="132" width="42" height="28" fill="#0E2233" opacity="0.7" />
        <polygon points="326,132 351,114 376,132" fill="#0E2233" opacity="0.7" />
        <rect x="344" y="144" width="13" height="16" fill="#F2B84B" opacity="0.8" />
      </g>
      <g>
        <rect x="175" y="100" width="130" height="60" fill="#0E2233" />
        <polygon points="165,100 240,58 315,100" fill="#0E2233" />
        <rect x="207" y="128" width="26" height="32" fill="#F7F3EC" />
        <rect x="249" y="112" width="28" height="24" rx="2" fill="#F2B84B" />
        <rect x="249" y="112" width="28" height="24" rx="2" fill="none" stroke="#0E2233" strokeWidth="2" />
        <rect x="233" y="68" width="10" height="20" fill="#0E2233" />
      </g>
      <g fill="none" stroke="#F2B84B" strokeWidth="4" strokeLinecap="round" opacity="0.85">
        <path d="M238 66 Q229 54 238 44 Q247 34 238 22" />
        <path d="M251 66 Q260 56 251 46 Q242 36 251 26" />
      </g>
      <g fill="#0E2233">
        <circle cx="140" cy="150" r="6" />
        <rect x="136" y="156" width="8" height="16" rx="3" />
        <line x1="136" y1="172" x2="130" y2="184" stroke="#0E2233" strokeWidth="4" strokeLinecap="round" />
        <line x1="144" y1="172" x2="148" y2="184" stroke="#0E2233" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g opacity="0.15" transform="translate(0,340) scale(1,-1)">
        <rect x="175" y="180" width="130" height="45" fill="#0E2233" />
        <polygon points="165,180 240,215 315,180" fill="#0E2233" />
      </g>
      <g fill="#F7F3EC" opacity="0.9">
        <circle cx="60" cy="70" r="2.5" />
        <circle cx="110" cy="100" r="2" />
        <circle cx="300" cy="60" r="2.5" />
        <circle cx="360" cy="90" r="2" />
        <circle cx="200" cy="30" r="2" />
        <circle cx="410" cy="120" r="2" />
      </g>
    </svg>
  );
}
