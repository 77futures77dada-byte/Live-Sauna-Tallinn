import type { SVGProps } from "react";

export function KeyDocumentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 110 90" {...props}>
      <rect
        x="0"
        y="0"
        width="110"
        height="72"
        rx="8"
        fill="#F7F3EC"
        stroke="#0E2233"
        strokeWidth="2"
      />
      <circle cx="24" cy="26" r="12" fill="#3FA9D6" />
      <rect x="44" y="18" width="52" height="6" rx="3" fill="#0E2233" />
      <rect
        x="44"
        y="30"
        width="40"
        height="6"
        rx="3"
        fill="#0E2233"
        opacity="0.5"
      />
      <rect
        x="12"
        y="50"
        width="86"
        height="6"
        rx="3"
        fill="#0E2233"
        opacity="0.3"
      />
      <g transform="translate(78,58) rotate(-30)">
        <circle
          cx="0"
          cy="0"
          r="11"
          fill="none"
          stroke="#E8632C"
          strokeWidth="5"
        />
        <rect x="8" y="-3" width="26" height="6" fill="#E8632C" />
        <rect x="28" y="3" width="6" height="8" fill="#E8632C" />
      </g>
    </svg>
  );
}
