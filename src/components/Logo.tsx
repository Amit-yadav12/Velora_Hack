/** Shared brand mark and wordmark used throughout the app. */

export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="42" height="42" rx="13" fill="#172747" stroke="#3e597b" strokeWidth="0.8" />
      <path
        d="M13 15.5 21.7 32c1.2 2.4 3.3 2.4 4.5 0l9.8-16.5"
        stroke="#e5f7f4"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="15.5" r="2.6" fill="#7eecc9" />
    </svg>
  );
}

export function Logo({ size = 32, text = true, className = '' }: { size?: number; text?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {text && <span className="font-semibold tracking-tight" style={{ fontSize: size * 0.56 }}>Velora</span>}
    </span>
  );
}

export default Logo;
