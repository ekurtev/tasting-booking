// Our own inline SVG icons and illustrations (no external images; decorative ones are aria-hidden).
type P = { size?: number };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const IconBox = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z" />
    <path d="M2 6h20v3H2z" />
    <path d="M12 6v15" />
    <path d="M12 6c-2-4-6-3-4 0M12 6c2-4 6-3 4 0" />
  </svg>
);
export const IconUsers = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16 14.2c2.9.3 5 2.6 5 5.8" />
  </svg>
);
export const IconHeart = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const IconBalloon = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3c3.3 0 6 2.6 6 6 0 3.8-3.2 7-6 7s-6-3.2-6-7c0-3.4 2.7-6 6-6z" />
    <path d="M11 16l-1 2h4l-1-2" />
    <path d="M12 18c0 2-2 2-2 3.5" />
  </svg>
);
export const IconCalendar = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M8 14h3v3H8z" />
  </svg>
);
export const IconPin = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);
export const IconCheck = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
);
export const IconSpoon = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <ellipse cx="8" cy="7" rx="3.5" ry="4.5" />
    <path d="M10 10.5L20 21" />
  </svg>
);
export const IconLeaf = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" />
    <path d="M5 19l8-8" />
  </svg>
);
export const IconShield = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
export const IconGlobe = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
  </svg>
);
export const IconCoin = ({ size = 28 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6.5V8M12 16v1.5" />
  </svg>
);

export const LogoMark = ({ size = 30 }: P) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect width="64" height="64" rx="16" fill="#a3324a" />
    <rect x="14" y="27" width="36" height="23" rx="3" fill="#fbf5ee" />
    <rect x="11" y="20" width="42" height="9" rx="3" fill="#fbeccf" />
    <rect x="29" y="20" width="6" height="30" fill="#7d2236" />
    <path
      d="M32 20c-6-9-14-6-10 0m10 0c6-9 14-6 10 0"
      fill="none"
      stroke="#fbf5ee"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/** Hero illustration: an open gift box with sweets. Purely decorative. */
export const HeroBox = () => (
  <svg className="hero-art" viewBox="0 0 360 300" aria-hidden="true" focusable="false">
    <ellipse cx="180" cy="272" rx="140" ry="16" fill="#2e1f17" opacity="0.08" />
    <g transform="rotate(-8 120 110)">
      <rect x="40" y="70" width="170" height="34" rx="8" fill="#7d2236" />
      <rect x="112" y="70" width="26" height="34" fill="#c9822b" />
    </g>
    <rect x="70" y="128" width="220" height="140" rx="14" fill="#a3324a" />
    <rect x="70" y="128" width="220" height="30" rx="10" fill="#7d2236" />
    <rect x="168" y="128" width="24" height="140" fill="#c9822b" />
    <circle cx="110" cy="122" r="20" fill="#fbeccf" stroke="#c9822b" strokeWidth="4" />
    <circle cx="110" cy="122" r="8" fill="#c9822b" />
    <rect x="134" y="96" width="36" height="36" rx="8" fill="#5b3a29" transform="rotate(12 152 114)" />
    <path d="M140 108h24M140 118h24" stroke="#8a5a3c" strokeWidth="3" transform="rotate(12 152 114)" />
    <circle cx="214" cy="116" r="18" fill="#f7e4e6" stroke="#a3324a" strokeWidth="4" />
    <path d="M206 116c4-6 12-6 16 0" stroke="#a3324a" strokeWidth="3" fill="none" />
    <path d="M240 108l28-8 6 28-28 8z" fill="#e7f0de" stroke="#7aa35b" strokeWidth="4" />
    <circle cx="300" cy="70" r="6" fill="#c9822b" />
    <circle cx="322" cy="104" r="4" fill="#a3324a" />
    <circle cx="48" cy="170" r="5" fill="#c9822b" />
    <path d="M300 40l4 8 8 4-8 4-4 8-4-8-8-4 8-4z" fill="#c9822b" />
    <path d="M40 220l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#a3324a" opacity="0.7" />
  </svg>
);
