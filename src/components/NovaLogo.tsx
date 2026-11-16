interface NovaLogoProps {
  size?: number;
  className?: string;
}

export function NovaLogo({ size = 36, className = "" }: NovaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="13"
        fill="#000000"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
      />
      <rect
        x="5"
        y="5"
        width="38"
        height="38"
        rx="10.5"
        fill="#0A0A0B"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
      <path
        d="M15.5 24.5L21.5 30.5L33 18"
        stroke="#FFFFFF"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
