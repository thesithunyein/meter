import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Globe, Gauge, Activity, Zap } from 'lucide-react'
import ProviderPage from './components/ProviderPage'
import PublicPage from './components/PublicPage'
import LiveFeed from './components/LiveFeed'
import MeterLogo from './components/MeterLogo'

type Tab = 'public' | 'provider' | 'feed'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'public', label: 'Endpoints', icon: <Globe size={14} /> },
  { id: 'provider', label: 'My APIs', icon: <Gauge size={14} /> },
  { id: 'feed', label: 'Live Feed', icon: <Activity size={14} /> },
]

const VIDEO_URL =
  'https://cdn.prod.website-files.com/6a515c956dc8efba8ea75c77%2F6a57765f503ac058e8a0c177_10994873-hd_1080_1920_25fps_mp4.mp4'

export default function App() {
  const [tab, setTab] = useState<Tab>('public')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      {/* ── Video hero ── */}
      <div className="video-hero" style={{ height: '420px' }}>
        <video
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div className="video-hero-overlay" />

        {/* Nav inside hero */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-5 flex items-center justify-between">
          <MeterLogo size={32} variant="full" />
          <ConnectKitButton />
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-5">
            <span
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(172,198,233,0.12)',
                border: '1px solid rgba(172,198,233,0.25)',
                color: 'var(--accent)',
              }}
            >
              <Zap size={11} />
              Onchain · Arc Mainnet
            </span>
          </div>

          {/* Headline */}
          <h1
            className="display text-5xl font-bold leading-none tracking-tight mb-4"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            Pay-per-Call
            <br />
            <span style={{ color: 'var(--accent)' }}>API Gateway</span>
          </h1>

          {/* Subline */}
          <p className="text-base max-w-sm" style={{ color: 'var(--muted)' }}>
            Any endpoint, any price, settled onchain with USDC.
            <br />
            The contract is the auth layer.
          </p>
        </div>
      </div>

      {/* ── Sticky tab bar ── */}
      <div
        className="sticky top-0 z-20 backdrop-blur-xl"
        style={{
          background: 'rgba(8,14,26,0.80)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-1 py-2">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  tab === t.id
                    ? {
                        background: 'rgba(172,198,233,0.15)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(172,198,233,0.20)',
                      }
                    : {
                        color: 'var(--subtle)',
                        background: 'transparent',
                        border: '1px solid transparent',
                      }
                }
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <main className="max-w-5xl mx-auto">
        {tab === 'public' && <PublicPage />}
        {tab === 'provider' && <ProviderPage />}
        {tab === 'feed' && <LiveFeed />}
      </main>
    </div>
  )
}
