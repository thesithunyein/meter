interface MeterLogoProps {
  size?: number
  variant?: 'mark' | 'full'
  className?: string
}

/**
 * Meter logomark — Arc-style geometric "M"
 * Single-weight stroked path, blue→cyan gradient, transparent background.
 * Inspired by Arc's clean geometric lettermark aesthetic.
 */
export default function MeterLogo({ size = 36, variant = 'full', className = '' }: MeterLogoProps) {
  const id = 'mg'
  return (
    <div className={`flex items-center gap-2.5 ${className}`} style={{ userSelect: 'none' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Primary gradient: Arc blue → cyan */}
          <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%"  stopColor="#5B8DEF" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          {/* Subtle outer glow */}
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="0 0 0 0 0.22   0 0 0 0 0.75   0 0 0 0 0.94   0 0 0 0.7 0"
              result="glow" />
            <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/*
          Geometric M:
          - Two outer vertical pillars with rounded tops
          - Two angled strokes meeting at a sharp center valley
          - Single stroke weight, no fill
          - Inspired by Arc's lettermark: minimal, geometric, confident
        */}
        <path
          d={[
            // Left pillar — top-left rounded corner, straight down
            'M 6 34',
            'L 6 10',
            'Q 6 6 10 6',
            'L 12 6',
            // Left diagonal down to center valley
            'L 20 22',
            // Right diagonal up from center valley
            'L 28 6',
            'L 30 6',
            // Right pillar top-right rounded corner
            'Q 34 6 34 10',
            'L 34 34',
          ].join(' ')}
          stroke={`url(#${id}-grad)`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${id}-glow)`}
        />

        {/* Inner M strokes — thinner, offset inward for Arc-style depth */}
        <path
          d={[
            'M 10 34',
            'L 10 13',
            'L 20 27',
            'L 30 13',
            'L 30 34',
          ].join(' ')}
          stroke={`url(#${id}-grad)`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
      </svg>

      {variant === 'full' && (
        <span
          className="display font-bold tracking-tight"
          style={{
            fontSize: size * 0.52,
            color: 'var(--ink)',
            letterSpacing: '-0.025em',
          }}
        >
          Meter
        </span>
      )}
    </div>
  )
}
