import type { SVGProps } from "react";

export function WaterBottleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 120" {...props}>
      <rect x="20" y="0" width="20" height="14" rx="3" fill="#0E2233" />
      <path
        d="M14 14 L46 14 L52 34 L52 110 Q52 118 44 118 L16 118 Q8 118 8 110 L8 34 Z"
        fill="#EAF6FA"
        stroke="#0E2233"
        strokeWidth="2"
      />
      <path
        d="M10 60 L50 60 L52 110 Q52 118 44 118 L16 118 Q8 118 8 110 Z"
        fill="#3FA9D6"
      />
      <rect
        x="16"
        y="30"
        width="4"
        height="70"
        rx="2"
        fill="#ffffff"
        opacity="0.5"
      />
    </svg>
  );
}
