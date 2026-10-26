import { useEffect, useRef } from 'react'

/**
 * Floating 3D glassmorphic API card for the hero right-side.
 * Tracks mouse position and tilts via CSS perspective transform.
 * Pure CSS animations for the floating orbs and particles — no canvas.
 */
export default function HeroCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const target = useRef({ rx: 0, ry: 0 })
  const current = useRef({ rx: 0, ry: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const card = cardRef.current
      if (!card) return
      const rect = card.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      target.current.rx = ((e.clientY - cy) / rect.height) * -18
      target.current.ry = ((e.clientX - cx) / rect.width) * 18
    }
    const onLeave = () => { target.current = { rx: 0, ry: 0 } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    const tick = () => {
      current.current.rx += (target.current.rx - current.current.rx) * 0.08
      current.current.ry += (target.current.ry - current.current.ry) * 0.08
      if (cardRef.current) {
        cardRef.current.style.transform =
          `perspective(900px) rotateX(${current.current.rx}deg) rotateY(${current.current.ry}deg) translateZ(0)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: 340 }}>
      {/* Ambient glow behind card */}
      <div
        className="absolute rounded-full"
        style={{
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'hero-pulse 4s ease-in-out infinite',
        }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            background: p.color,
            left: p.x, top: p.y,
            opacity: 0.7,
            animation: `hero-float ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}

      {/* 3D card */}
      <div
        ref={cardRef}
        className="relative"
        style={{
          width: 300,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          transition: 'transform 0.05s linear',
        }}
      >
        {/* Card face */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(16,26,48,0.72)',
            border: '1px solid rgba(172,198,233,0.18)',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(172,198,233,0.10)',
          }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8' }}
              >
                API
              </div>
              <span className="text-xs font-semibold" style={{ color: 'rgba(172,198,233,0.9)' }}>
                random fact
              </span>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(34,211,238,0.12)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}
            >
              active
            </span>
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-2xl font-bold display" style={{ color: '#fff' }}>0.01</span>
            <span className="text-sm font-semibold" style={{ color: '#38BDF8' }}>USDC</span>
            <span className="text-xs ml-1" style={{ color: 'rgba(172,198,233,0.45)' }}>/ call</span>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(172,198,233,0.08)', marginBottom: 14 }} />

          {/* Animated tx rows */}
          {TX_ROWS.map((tx, i) => (
            <div
              key={i}
              className="flex items-center justify-between mb-2.5"
              style={{ animation: `hero-fadein 0.4s ease ${0.1 * i + 0.3}s both` }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#22D3EE', boxShadow: '0 0 4px #22D3EE' }}
                />
                <span className="text-xs font-mono" style={{ color: 'rgba(172,198,233,0.5)' }}>
                  {tx.addr}
                </span>
              </div>
              <span className="text-xs font-semibold" style={{ color: 'rgba(172,198,233,0.8)' }}>
                {tx.amount}
              </span>
            </div>
          ))}

          {/* Pulsing bottom bar */}
          <div
            className="mt-4 rounded-xl px-4 py-2.5 flex items-center justify-between"
            style={{
              background: 'rgba(56,189,248,0.07)',
              border: '1px solid rgba(56,189,248,0.15)',
            }}
          >
            <span className="text-xs" style={{ color: 'rgba(172,198,233,0.5)' }}>Settled onchain</span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#22D3EE', animation: 'hero-pulse 1.5s ease-in-out infinite' }}
              />
              <span className="text-xs font-semibold" style={{ color: '#22D3EE' }}>Arc Mainnet</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hero-float {
          from { transform: translateY(0px) translateX(0px); }
          to   { transform: translateY(-12px) translateX(4px); }
        }
        @keyframes hero-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.06); }
        }
        @keyframes hero-fadein {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

const PARTICLES = [
  { size: 5,  x: '12%',  y: '18%', color: '#38BDF8', dur: 3.2, delay: 0    },
  { size: 3,  x: '80%',  y: '12%', color: '#22D3EE', dur: 4.1, delay: 0.5  },
  { size: 4,  x: '88%',  y: '72%', color: '#5B8DEF', dur: 3.7, delay: 1.0  },
  { size: 6,  x: '5%',   y: '68%', color: '#38BDF8', dur: 4.5, delay: 0.3  },
  { size: 3,  x: '50%',  y: '90%', color: '#22D3EE', dur: 3.0, delay: 1.5  },
  { size: 4,  x: '70%',  y: '30%', color: '#acc6e9', dur: 5.0, delay: 0.8  },
]

const TX_ROWS = [
  { addr: '0x7A35…9Da2', amount: '0.01 USDC' },
  { addr: '0xAbC1…4F2e', amount: '0.01 USDC' },
  { addr: '0x19dF…88b3', amount: '0.01 USDC' },
]
