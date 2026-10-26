import { useState } from 'react'
import { ChevronDown, Zap, Shield, Globe, Activity, Code2, DollarSign } from 'lucide-react'

interface LandingPageProps {
  onNavigate: (tab: 'public' | 'provider' | 'feed') => void
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Register an endpoint',
    desc: 'Providers register any HTTP endpoint with a name, URL, and USDC price. The contract stores it permanently onchain.',
    icon: <Code2 size={22} />,
    cta: 'Register mine',
    tab: 'provider' as const,
  },
  {
    step: '02',
    title: 'Caller pays USDC',
    desc: 'A caller approves USDC once, then calls pay(). The contract transfers USDC directly from caller to provider — no custody, no middleman.',
    icon: <DollarSign size={22} />,
    cta: 'Browse endpoints',
    tab: 'public' as const,
  },
  {
    step: '03',
    title: 'Tx hash is the key',
    desc: 'The contract emits a Paid event. The caller passes the tx hash to the endpoint. The endpoint verifies onchain and returns the response.',
    icon: <Shield size={22} />,
    cta: 'See live feed',
    tab: 'feed' as const,
  },
]

const FAQS = [
  {
    q: 'Do I need to sign up or create an account?',
    a: 'No. Just connect any EVM wallet. Your wallet address is your identity — no email, no account, no KYC.',
  },
  {
    q: 'How does payment verification work?',
    a: 'When you call pay(), the MeterRegistry contract emits a Paid event with your address, the endpoint ID, the amount, and a nonce. The endpoint reads that event from Arc mainnet to confirm the payment before responding.',
  },
  {
    q: 'Can I use Meter with AI agents?',
    a: 'Yes — that\'s the primary use case. An agent holds USDC on Arc mainnet, approves the registry contract once, and can call any registered endpoint autonomously by sending a pay() transaction.',
  },
  {
    q: 'What happens if I call an endpoint without paying?',
    a: 'The endpoint checks the x-payment-tx header against the onchain Paid event. Without a valid tx hash from the current caller, it returns HTTP 402 Payment Required.',
  },
  {
    q: 'Can a provider change the price after registering?',
    a: 'Not on the current contract — prices are set at registration. Providers can deactivate an endpoint and register a new one at a different price.',
  },
  {
    q: 'What token is used for payment?',
    a: 'USDC on Arc mainnet (0x3600000000000000000000000000000000000000). On Arc, USDC is the native gas token, so you only need one token for everything.',
  },
]

const FEATURES = [
  { icon: <Zap size={18} />, title: 'Instant settlement', desc: 'Sub-second finality on Arc. USDC lands in the provider wallet in the same block.' },
  { icon: <Shield size={18} />, title: 'Contract-enforced auth', desc: 'No API keys, no OAuth. The Paid event is the proof. Unforgeable, onchain, permanent.' },
  { icon: <Globe size={18} />, title: 'Any HTTP endpoint', desc: 'REST, GraphQL, AI inference, data feeds — if it\'s HTTP, it can be monetized.' },
  { icon: <Activity size={18} />, title: 'Fully permissionless', desc: 'No owner, no admin, no pause. The registry is immutable once deployed.' },
]

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div>
      {/* ── CTA row ── */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 flex flex-col sm:flex-row gap-4">
        {/* Get Started — primary */}
        <button
          onClick={() => onNavigate('public')}
          className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #5B8DEF 0%, #38BDF8 60%, #22D3EE 100%)',
            color: '#080e1a',
            boxShadow: '0 0 20px rgba(56,189,248,0.35)',
          }}
        >
          <Zap size={15} /> Get Started
        </button>
        {/* How It Works — scrolls down */}
        <button
          onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
          style={{
            background: 'rgba(172,198,233,0.08)',
            border: '1px solid rgba(172,198,233,0.22)',
            color: 'var(--ink)',
          }}
        >
          <ChevronDown size={15} /> How It Works
        </button>
        {/* Browse Endpoints — glass */}
        <button
          onClick={() => onNavigate('public')}
          className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
          style={{
            background: 'transparent',
            border: '1px solid rgba(172,198,233,0.15)',
            color: 'var(--subtle)',
          }}
        >
          <Globe size={15} /> Browse Endpoints
        </button>
      </section>

      {/* ── Features grid ── */}
      <section
        className="py-20"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-10" style={{ color: 'var(--subtle)' }}>
            Why Meter
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-2xl p-5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(172,198,233,0.12)', color: 'var(--accent)' }}
                >
                  {f.icon}
                </div>
                <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{f.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--subtle)' }}>
            How it works
          </p>
          <h2 className="display text-3xl font-bold mb-14" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Three steps, fully onchain
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(item => (
              <div
                key={item.step}
                className="relative rounded-2xl p-7 flex flex-col gap-5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {/* Step number */}
                <span
                  className="text-xs font-bold tracking-widest"
                  style={{ color: 'rgba(172,198,233,0.35)' }}
                >
                  {item.step}
                </span>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(172,198,233,0.10)', color: 'var(--accent)' }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>{item.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{item.desc}</p>
                </div>
                <button
                  onClick={() => onNavigate(item.tab)}
                  className="mt-auto self-start text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  {item.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Code snippet ── */}
      <section
        className="py-20"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--subtle)' }}>
              For AI agents
            </p>
            <h2 className="display text-3xl font-bold mb-4" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              USDC is the API key
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)' }}>
              Agents call <code style={{ color: 'var(--accent)', background: 'rgba(172,198,233,0.10)', padding: '2px 5px', borderRadius: '4px' }}>pay(endpointId)</code> once and pass the tx hash as proof. No tokens to rotate, no rate limits to manage, no billing portals to authenticate against.
            </p>
            <button
              onClick={() => onNavigate('public')}
              className="text-sm font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              <Zap size={13} /> Try the demo endpoint →
            </button>
          </div>
          <div
            className="rounded-2xl p-6 font-mono text-xs leading-relaxed overflow-x-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            <p style={{ color: 'rgba(172,198,233,0.4)' }}>{'// 1. Approve USDC once'}</p>
            <p><span style={{ color: '#38BDF8' }}>usdc</span>.approve(registry, price)</p>
            <br />
            <p style={{ color: 'rgba(172,198,233,0.4)' }}>{'// 2. Pay & get tx hash'}</p>
            <p><span style={{ color: '#38BDF8' }}>const</span> tx = <span style={{ color: '#38BDF8' }}>await</span> registry.pay(endpointId)</p>
            <br />
            <p style={{ color: 'rgba(172,198,233,0.4)' }}>{'// 3. Call the endpoint'}</p>
            <p><span style={{ color: '#38BDF8' }}>fetch</span>(url, {'{'}</p>
            <p>{'  '}headers: {'{'}</p>
            <p>{'    '}<span style={{ color: '#22D3EE' }}>'x-payment-tx'</span>: tx.hash</p>
            <p>{'  '}{'}'}</p>
            <p>{'}'}</p>
            <br />
            <p style={{ color: 'rgba(172,198,233,0.4)' }}>{'// ✓ Response arrives — paid.'}</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--subtle)' }}>
            FAQ
          </p>
          <h2 className="display text-3xl font-bold mb-12" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Common questions
          </h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <button
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-white/[0.02]"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      color: 'var(--subtle)',
                      flexShrink: 0,
                      transition: 'transform 0.2s',
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section
        className="py-24"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="display text-4xl font-bold mb-4" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Ready to monetize your API?
          </h2>
          <p className="text-base mb-10 max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
            Register in 30 seconds. No setup, no billing, no accounts. Just USDC.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('provider')}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #5B8DEF 0%, #38BDF8 60%, #22D3EE 100%)',
                color: '#080e1a',
                boxShadow: '0 0 24px rgba(56,189,248,0.3)',
              }}
            >
              <Code2 size={15} /> Register an Endpoint
            </button>
            <button
              onClick={() => onNavigate('public')}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
              style={{
                background: 'rgba(172,198,233,0.08)',
                border: '1px solid rgba(172,198,233,0.22)',
                color: 'var(--ink)',
              }}
            >
              <Globe size={15} /> Browse Endpoints
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-10"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold display" style={{ color: 'var(--ink)' }}>Meter</span>
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>Pay-per-call API gateway on Arc</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--subtle)' }}>
            <a
              href="https://github.com/thesithunyein/meter"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              style={{ color: 'var(--subtle)' }}
            >
              GitHub
            </a>
            <a
              href="https://explorer.arc.io/address/0x423B8701Da3a251a3A3fc2d241b71e8d05744C91"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              style={{ color: 'var(--subtle)' }}
            >
              Contract
            </a>
            <button
              onClick={() => onNavigate('feed')}
              className="hover:text-white transition-colors"
            >
              Live Feed
            </button>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Built on Arc Mainnet</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
