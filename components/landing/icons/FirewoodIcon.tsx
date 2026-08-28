import type { SVGProps } from "react";

export function FirewoodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 140 90" {...props}>
      <g transform="translate(10,10)">
        <rect x="0" y="0" width="120" height="20" rx="10" fill="#8a5a34" />
        <circle
          cx="0"
          cy="10"
          r="10"
          fill="#d9a66c"
          stroke="#6b4423"
          strokeWidth="1.5"
        />
        <circle cx="0" cy="10" r="4" fill="#6b4423" />
        <rect x="10" y="26" width="120" height="20" rx="10" fill="#9a683d" />
        <circle
          cx="10"
          cy="36"
          r="10"
          fill="#dcab73"
          stroke="#6b4423"
          strokeWidth="1.5"
        />
        <circle cx="10" cy="36" r="4" fill="#6b4423" />
        <rect x="0" y="52" width="120" height="20" rx="10" fill="#8a5a34" />
        <circle
          cx="0"
          cy="62"
          r="10"
          fill="#d9a66c"
          stroke="#6b4423"
          strokeWidth="1.5"
        />
        <circle cx="0" cy="62" r="4" fill="#6b4423" />
        <path
          d="M60 -6 L60 78"
          stroke="#E8632C"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
