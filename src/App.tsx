import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Gauge, Globe, Activity } from 'lucide-react'
import ProviderPage from './components/ProviderPage'
import PublicPage from './components/PublicPage'
import LiveFeed from './components/LiveFeed'

type Tab = 'public' | 'provider' | 'feed'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'public', label: 'Endpoints', icon: <Globe size={15} /> },
  { id: 'provider', label: 'My APIs', icon: <Gauge size={15} /> },
  { id: 'feed', label: 'Live Feed', icon: <Activity size={15} /> },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('public')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* Top nav */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b border-[var(--border)] bg-[var(--surface-strong)]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Gauge size={14} className="text-white" />
            </div>
            <span className="text-base font-bold text-[var(--ink)] display tracking-tight">Meter</span>
            <span className="hidden sm:inline text-xs text-[var(--muted)] ml-1">Pay-per-Call API Gateway</span>
          </div>
          <ConnectKitButton />
        </div>
        {/* Tab bar */}
        <div className="max-w-lg mx-auto px-4 flex gap-1 pb-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Page content */}
      <main>
        {tab === 'public' && <PublicPage />}
        {tab === 'provider' && <ProviderPage />}
        {tab === 'feed' && <LiveFeed />}
      </main>
    </div>
  )
}
