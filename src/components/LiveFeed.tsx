import { useEffect, useState } from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arc } from 'viem/chains'
import { Activity, ExternalLink } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { METER_REGISTRY_ADDRESS, IS_CONTRACT_DEPLOYED } from '@/contracts/meter-registry'
import { TARGET_CHAIN_ID } from '@/config'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { Amount } from '@/onchain-money'

interface PaidEvent {
  caller: string
  endpointId: bigint
  amount: bigint
  nonce: bigint
  txHash: `0x${string}`
  blockNumber: bigint
  timestamp: number
}

const PAID_EVENT = parseAbiItem(
  'event Paid(address indexed caller, uint256 indexed endpointId, uint256 amount, uint256 nonce)',
)

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function timeAgo(ts: number) {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

export default function LiveFeed() {
  const [events, setEvents] = useState<PaidEvent[]>([])
  const [loading, setLoading] = useState(IS_CONTRACT_DEPLOYED)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!IS_CONTRACT_DEPLOYED) {
      return
    }

    const client = createPublicClient({
      chain: arc,
      transport: http('https://rpc.mainnet.arc.io'), // arc-studio-allow-onchain-literal
    })

    let unwatch: (() => void) | undefined

    async function init() {
      try {
        // Fetch recent history (last 5000 blocks)
        const head = await client.getBlockNumber()
        const fromBlock = head > 5000n ? head - 5000n : 0n

        const logs = await client.getLogs({
          address: METER_REGISTRY_ADDRESS,
          event: PAID_EVENT,
          fromBlock,
          toBlock: head,
        })

        const parsed: PaidEvent[] = logs
          .filter(l => l.args.caller && l.args.endpointId !== undefined)
          .map(l => ({
            caller: l.args.caller!,
            endpointId: l.args.endpointId!,
            amount: l.args.amount ?? 0n,
            nonce: l.args.nonce ?? 0n,
            txHash: l.transactionHash,
            blockNumber: l.blockNumber ?? 0n,
            timestamp: Date.now() - Number(head - (l.blockNumber ?? head)) * 2000, // ~2s blocks
          }))
          .reverse()

        setEvents(parsed.slice(0, 50))
        setLoading(false)

        // Live subscription
        unwatch = client.watchEvent({
          address: METER_REGISTRY_ADDRESS,
          event: PAID_EVENT,
          onLogs: (newLogs) => {
            const newEvents: PaidEvent[] = newLogs
              .filter(l => l.args.caller && l.args.endpointId !== undefined)
              .map(l => ({
                caller: l.args.caller!,
                endpointId: l.args.endpointId!,
                amount: l.args.amount ?? 0n,
                nonce: l.args.nonce ?? 0n,
                txHash: l.transactionHash,
                blockNumber: l.blockNumber ?? 0n,
                timestamp: Date.now(),
              }))
            setEvents(prev => [...newEvents, ...prev].slice(0, 50))
          },
        })
      } catch {
        setError('Could not load events. Check RPC connection.')
        setLoading(false)
      }
    }

    void init()
    return () => { unwatch?.() }
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Activity size={18} style={{ color: 'var(--accent)' }} />
        <h2 className="text-lg font-semibold display" style={{ color: 'var(--ink)' }}>Live Feed</h2>
        {!loading && IS_CONTRACT_DEPLOYED && (
          <span className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: 'var(--success)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
            Live
          </span>
        )}
      </div>

      {!IS_CONTRACT_DEPLOYED && (
        <div className="rounded-xl px-4 py-3 text-xs"
          style={{ background: 'rgba(232,172,50,0.08)', border: '1px solid rgba(232,172,50,0.25)', color: '#e8ac32' }}>
          Contract not deployed yet. Set <code className="font-mono">VITE_METER_REGISTRY_ADDRESS</code> after deployment.
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-xs"
          style={{ background: 'rgba(232,109,122,0.10)', border: '1px solid rgba(232,109,122,0.25)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading && IS_CONTRACT_DEPLOYED && (
        <div className="space-y-2">
          {([0, 1, 2, 3] as const).map(i => (
            <div key={i} className="h-16 rounded-xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      )}

      {!loading && events.length === 0 && IS_CONTRACT_DEPLOYED && (
        <div className="text-center py-12 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[var(--success)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-xs font-medium">Watching for payments...</span>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Waiting for the first onchain payment. Make a call on the Endpoints tab to appear here.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {events.map((ev, i) => (
          <div
            key={`${ev.txHash}-${i}`}
            className="backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: 'var(--ink-2)' }}>{formatAddress(ev.caller)}</span>
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>called</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(172,198,233,0.10)', color: 'var(--accent)' }}>
                  #{ev.endpointId.toString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>{timeAgo(ev.timestamp)}</span>
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>nonce {ev.nonce.toString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <TokenUSDC size={13} variant="branded" />
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                {Amount.fromRaw(ev.amount, 6).toFixed(4)}
              </span>
            </div>
            <a
              href={buildTxExplorerUrl(TARGET_CHAIN_ID, ev.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: 'var(--subtle)' }}
            >
              <ExternalLink size={13} />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
