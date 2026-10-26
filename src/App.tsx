import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Globe, Gauge, Activity, Zap, Home } from 'lucide-react'
import ProviderPage from './components/ProviderPage'
import PublicPage from './components/PublicPage'
import LiveFeed from './components/LiveFeed'
import LandingPage from './components/LandingPage'
import MeterLogo from './components/MeterLogo'

type Tab = 'home' | 'public' | 'provider' | 'feed'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home',     label: 'Home',      icon: <Home size={14} /> },
  { id: 'public',  label: 'Endpoints', icon: <Globe size={14} /> },
  { id: 'provider',label: 'My APIs',   icon: <Gauge size={14} /> },
  { id: 'feed',    label: 'Live Feed', icon: <Activity size={14} /> },
]

const VIDEO_URL =
  'https://cdn.prod.website-files.com/6a515c956dc8efba8ea75c77%2F6a57765f503ac058e8a0c177_10994873-hd_1080_1920_25fps_mp4.mp4'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      {/* ── Video hero ── */}
      <div className="video-hero" style={{ height: tab === 'home' ? '520px' : '320px' }}>
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
          <button onClick={() => setTab('home')} className="focus:outline-none">
            <MeterLogo size={32} variant="full" />
          </button>
          <ConnectKitButton />
        </div>

        {/* Hero copy — only on home */}
        {tab === 'home' && (
          <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16">
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

            <h1
              className="display text-5xl font-bold leading-none tracking-tight mb-4"
              style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
            >
              Pay-per-Call
              <br />
              <span style={{ color: 'var(--accent)' }}>API Gateway</span>
            </h1>

            <p className="text-base max-w-sm" style={{ color: 'var(--muted)' }}>
              Any endpoint, any price, settled onchain with USDC.
              <br />
              The contract is the auth layer.
            </p>
          </div>
        )}

        {/* Page title for sub-pages */}
        {tab !== 'home' && (
          <div className="relative z-10 max-w-5xl mx-auto px-6 pt-10">
            <h1 className="display text-3xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {tab === 'public' && 'Endpoints'}
              {tab === 'provider' && 'My APIs'}
              {tab === 'feed' && 'Live Feed'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {tab === 'public' && 'Browse and call registered API endpoints with USDC.'}
              {tab === 'provider' && 'Register and manage your API endpoints.'}
              {tab === 'feed' && 'Real-time stream of onchain payment events.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Sticky tab bar — hidden on home ── */}
      {tab !== 'home' && (
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
      )}

      {/* ── Page content ── */}
      <main>
        {tab === 'home'     && <LandingPage onNavigate={setTab} />}
        {tab === 'public'   && <div className="max-w-5xl mx-auto"><PublicPage /></div>}
        {tab === 'provider' && <div className="max-w-5xl mx-auto"><ProviderPage /></div>}
        {tab === 'feed'     && <div className="max-w-5xl mx-auto"><LiveFeed /></div>}
      </main>
    </div>
  )
}
