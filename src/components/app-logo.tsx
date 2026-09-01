/**
 * In-app logo. Inline SVG so it follows the active theme
 * (`--primary` tile, `--primary-foreground` marks). The favicon
 * (src/app/icon.svg) stays as-is.
 */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="LazyFit">
      <rect width="512" height="512" rx="112" fill="hsl(var(--primary))" />
      <g fill="none" stroke="hsl(var(--primary-foreground))" strokeLinecap="round">
        <ellipse
          cx="256"
          cy="256"
          rx="202"
          ry="112"
          strokeWidth="18"
          transform="rotate(-32 256 256)"
        />
        <ellipse
          cx="256"
          cy="256"
          rx="230"
          ry="140"
          strokeWidth="8"
          transform="rotate(-32 256 256)"
        />
      </g>
      <path
        fill="hsl(var(--primary-foreground))"
        d="M246 108c11 79 29 104 116 118l112 19-112 19c-87 14-105 39-116 118-11-79-29-104-116-118L18 245l112-19c87-14 105-39 116-118Z"
      />
      <path
        fill="hsl(var(--primary-foreground))"
        d="M126 74c5 35 14 44 49 49-35 5-44 14-49 49-5-35-14-44-49-49 35-5 44-14 49-49Z"
      />
      <path
        fill="hsl(var(--primary-foreground))"
        d="M361 339c4 28 12 36 40 40-28 4-36 12-40 40-4-28-12-36-40-40 28-4 36-12 40-40Z"
      />
    </svg>
  );
}
