/**
 * Meter logo — geometric "M" mark.
 * Two outer verticals rise to a center peak, rendered as a single
 * continuous polyline in the Arc Dark accent colour with a soft glow.
 */
interface Props {
  size?: number
  /** 'mark' = icon square only  |  'full' = icon + wordmark side by side */
  variant?: 'mark' | 'full'
}

export default function MeterLogo({ size = 32, variant = 'mark' }: Props) {
  const s = size
  // The M is drawn inside a padded square so strokes don't clip
  const pad = s * 0.14
  const w = s - pad * 2
  const h = s - pad * 2
  const ox = pad
  const oy = pad + h * 0.06  // slight top offset so M breathes

  // Key x points (proportional within w)
  const x0 = ox                    // left vertical
  const x2 = ox + w * 0.5          // center valley / peak
  const x4 = ox + w                // right vertical

  // Key y points
  const yTop  = oy                  // top of verticals
  const yPeak = oy + h * 0.32       // peak of inner V
  const yBot  = oy + h              // bottom of verticals

  // Single polyline: left-bottom → left-top → center-peak → right-top → right-bottom
  const points = [
    [x0, yBot],
    [x0, yTop],
    [x2, yPeak],
    [x4, yTop],
    [x4, yBot],
  ]
    .map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`)
    .join(' ')

  const strokeW = s * 0.09

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: s * 0.28 }}>
      {/* Icon square */}
      <div
        style={{
          width: s,
          height: s,
          borderRadius: s * 0.28,
          background: 'rgba(172,198,233,0.10)',
          border: '1px solid rgba(172,198,233,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width={s}
          height={s}
          viewBox={`0 0 ${s} ${s}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Meter logo"
        >
          <defs>
            <filter id="m-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation={s * 0.07} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <polyline
            points={points}
            stroke="#acc6e9"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#m-glow)"
          />
          {/* Subtle horizontal baseline */}
          <line
            x1={x0 - strokeW * 0.3}
            y1={yBot}
            x2={x4 + strokeW * 0.3}
            y2={yBot}
            stroke="rgba(172,198,233,0.30)"
            strokeWidth={strokeW * 0.45}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Wordmark */}
      {variant === 'full' && (
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: s * 0.56,
            letterSpacing: '-0.03em',
            color: '#f1f5fd',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          Meter
        </span>
      )}
    </div>
  )
}
