import { useState, useCallback, useEffect } from 'react'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSwitchChain,
} from 'wagmi'
import { erc20Abi } from 'viem'
import { Loader2, ExternalLink, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { TokenUSDC } from '@web3icons/react'
import { METER_REGISTRY_ADDRESS, METER_REGISTRY_ABI, IS_CONTRACT_DEPLOYED } from '@/contracts/meter-registry'
import { TARGET_CHAIN_ID } from '@/config'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount } from '@/onchain-money'

const usdcFact = getUsdc(TARGET_CHAIN_ID)!

type CallPhase =
  | 'idle'
  | 'approving'
  | 'paying'
  | 'waiting_confirm'
  | 'calling'

type CallStatus =
  | { phase: CallPhase }
  | { phase: 'done'; hash: `0x${string}`; response: string }
  | { phase: 'error'; message: string }

function EndpointCard({ id }: { id: bigint }) {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID

  const { data } = useReadContract({
    address: METER_REGISTRY_ADDRESS,
    abi: METER_REGISTRY_ABI,
    functionName: 'endpoints',
    args: [id],
    chainId: TARGET_CHAIN_ID,
  })

  const [status, setStatus] = useState<CallStatus>({ phase: 'idle' })
  const [payHash, setPayHash] = useState<`0x${string}` | undefined>()
  const [pendingUrl, setPendingUrl] = useState<string | undefined>()

  const { writeContractAsync: approveUsdc } = useWriteContract()
  const { writeContractAsync: payEndpoint } = useWriteContract()

  const { isSuccess: txConfirmed, isError: txFailed } = useWaitForTransactionReceipt({
    hash: payHash,
    chainId: TARGET_CHAIN_ID,
  })

  // When the tx confirms, call the endpoint URL
  useEffect(() => {
    if (!txConfirmed || !payHash || !pendingUrl || status.phase !== 'waiting_confirm') return
    const hash = payHash
    const url = pendingUrl

    void (async () => {
      // Transition to 'calling' inside async to avoid synchronous setState-in-effect
      await Promise.resolve()
      setStatus({ phase: 'calling' })
      try {
        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'x-payment-tx': hash, 'x-chain-id': String(TARGET_CHAIN_ID) },
        })
        const response = await resp.text()
        if (!resp.ok) {
          setStatus({ phase: 'error', message: `Endpoint returned ${resp.status}: ${response.slice(0, 200)}` })
        } else {
          setStatus({ phase: 'done', hash, response })
        }
      } catch (err) {
        setStatus({ phase: 'error', message: `Could not reach endpoint: ${(err as Error).message}` })
      }
    })()
  }, [txConfirmed, payHash, pendingUrl, status.phase])

  useEffect(() => {
    if (!txFailed || status.phase !== 'waiting_confirm') return
    void Promise.resolve().then(() => {
      setStatus({ phase: 'error', message: 'Transaction failed onchain' })
    })
  }, [txFailed, status.phase])

  const handleCall = useCallback(async () => {
    if (!isConnected || !address) { toast.error('Connect wallet first'); return }
    if (isWrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (!data) return

    const [, , url, price, active] = data
    if (!active) { toast.error('Endpoint is inactive'); return }

    try {
      // Step 1: Approve USDC spending for the registry
      setStatus({ phase: 'approving' })
      await approveUsdc({
        address: usdcFact.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [METER_REGISTRY_ADDRESS, price],
        chainId: TARGET_CHAIN_ID,
      })

      // Step 2: Call pay() on the contract
      setStatus({ phase: 'paying' })
      const hash = await payEndpoint({
        address: METER_REGISTRY_ADDRESS,
        abi: METER_REGISTRY_ABI,
        functionName: 'pay',
        args: [id],
        chainId: TARGET_CHAIN_ID,
      })
      setPayHash(hash)
      setPendingUrl(url)
      setStatus({ phase: 'waiting_confirm' })
      // Step 3 + 4 handled reactively via useEffect above
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? ''
      if (msg.includes('rejected') || msg.includes('denied')) {
        setStatus({ phase: 'idle' })
        toast.info('Cancelled')
      } else {
        setStatus({ phase: 'error', message: msg.slice(0, 160) })
      }
    }
  }, [isConnected, isWrongChain, address, data, id, approveUsdc, payEndpoint, switchChain])

  if (!data) return null
  const [, name, url, price, active] = data
  const formattedPrice = Amount.fromRaw(price, 6).toFixed(4)

  // Parse fact text from JSON response if possible
  function parseResponse(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (typeof parsed.fact === 'string') return parsed.fact
      if (typeof parsed.result === 'string') return parsed.result
      if (typeof parsed.message === 'string') return parsed.message
    } catch {
      // not JSON — return as-is
    }
    return raw
  }

  return (
    <div
      className="backdrop-blur-sm rounded-2xl p-5 space-y-4 transition-all"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
              style={active ? { boxShadow: '0 0 6px var(--success)' } : {}}
            />
            <h3 className="text-base font-semibold truncate" style={{ color: 'var(--ink)' }}>{name}</h3>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--subtle)' }}>
              #{id.toString()}
            </span>
          </div>
          <p className="text-xs truncate font-mono" style={{ color: 'var(--subtle)' }}>{url}</p>
        </div>
        <div
          className="flex items-center gap-1.5 flex-shrink-0 rounded-xl px-3 py-2"
          style={{ background: 'rgba(172,198,233,0.10)', border: '1px solid rgba(172,198,233,0.18)' }}
        >
          <TokenUSDC size={14} variant="branded" />
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{formattedPrice}</span>
        </div>
      </div>

      {status.phase === 'done' && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(111,217,138,0.08)', border: '1px solid rgba(111,217,138,0.20)' }}>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
            <CheckCircle size={14} />
            <span className="text-xs font-semibold">Payment confirmed — endpoint response:</span>
          </div>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--ink)' }}>
            {parseResponse(status.response)}
          </p>
          <a
            href={buildTxExplorerUrl(TARGET_CHAIN_ID, status.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            <ExternalLink size={11} /> View on explorer
          </a>
        </div>
      )}

      {status.phase === 'error' && (
        <div className="rounded-xl p-3 flex gap-2"
          style={{ background: 'rgba(232,109,122,0.10)', border: '1px solid rgba(232,109,122,0.25)' }}>
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
          <p className="text-xs" style={{ color: 'var(--danger)' }}>{status.message}</p>
        </div>
      )}

      <button
        onClick={
          !isConnected
            ? () => toast.info('Connect your wallet to call this endpoint')
            : status.phase === 'done' || status.phase === 'error'
              ? () => setStatus({ phase: 'idle' })
              : () => void handleCall()
        }
        disabled={
          !active ||
          (isConnected && status.phase !== 'idle' && status.phase !== 'done' && status.phase !== 'error')
        }
        className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{
          background: active ? 'rgba(172,198,233,0.15)' : 'rgba(255,255,255,0.04)',
          border: active ? '1px solid rgba(172,198,233,0.30)' : '1px solid rgba(255,255,255,0.08)',
          color: active ? 'var(--accent)' : 'var(--subtle)',
        }}
      >
        {status.phase === 'approving' && <><Loader2 size={14} className="animate-spin" /> Approve USDC...</>}
        {status.phase === 'paying' && <><Loader2 size={14} className="animate-spin" /> Confirm payment...</>}
        {status.phase === 'waiting_confirm' && <><Loader2 size={14} className="animate-spin" /> Confirming...</>}
        {status.phase === 'calling' && <><Loader2 size={14} className="animate-spin" /> Calling endpoint...</>}
        {status.phase === 'done' && <><CheckCircle size={14} /> Try again</>}
        {status.phase === 'error' && <><AlertCircle size={14} /> Retry</>}
        {!isConnected && active && <><Zap size={14} /> Connect wallet to call</>}
        {isConnected && status.phase === 'idle' && (
          active
            ? <><Zap size={14} /> Call for {formattedPrice} USDC</>
            : 'Inactive'
        )}
      </button>
    </div>
  )
}

export default function PublicPage() {
  const { data: endpointCount } = useReadContract({
    address: METER_REGISTRY_ADDRESS,
    abi: METER_REGISTRY_ABI,
    functionName: 'endpointCount',
    chainId: TARGET_CHAIN_ID,
    query: { refetchInterval: 10_000 },
  })

  const ids = endpointCount
    ? Array.from({ length: Number(endpointCount) }, (_, i) => BigInt(i))
    : []

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold display" style={{ color: 'var(--ink)' }}>All Endpoints</h2>
        <span
          className="text-xs tabular-nums px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          {ids.length} registered
        </span>
      </div>

      {!IS_CONTRACT_DEPLOYED && (
        <div className="rounded-xl px-4 py-3 flex gap-2"
          style={{ background: 'rgba(232,172,50,0.08)', border: '1px solid rgba(232,172,50,0.25)' }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#e8ac32' }} />
          <p className="text-xs" style={{ color: '#e8ac32' }}>
            Contract not deployed yet. Set <code className="font-mono">VITE_METER_REGISTRY_ADDRESS</code> after deployment.
          </p>
        </div>
      )}

      {endpointCount === undefined && IS_CONTRACT_DEPLOYED && (
        <div className="space-y-3">
          {([0, 1] as const).map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      )}

      {endpointCount !== undefined && ids.length === 0 && IS_CONTRACT_DEPLOYED && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
          No endpoints registered yet.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {ids.map(id => (
          <EndpointCard key={id.toString()} id={id} />
        ))}
      </div>
    </div>
  )
}
