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
    <div className="bg-[var(--surface)] backdrop-blur-sm border border-[var(--border)] rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
            <h3 className="text-base font-semibold text-[var(--ink)] truncate">{name}</h3>
          </div>
          <p className="text-xs text-[var(--muted)] truncate mt-0.5 font-mono">{url}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 bg-[var(--surface-muted)] rounded-lg px-3 py-1.5">
          <TokenUSDC size={14} variant="branded" />
          <span className="text-sm font-bold tabular-nums text-[var(--ink)]">{formattedPrice}</span>
        </div>
      </div>

      {status.phase === 'done' && (
        <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[var(--success)]">
            <CheckCircle size={14} />
            <span className="text-xs font-semibold">Payment confirmed. Endpoint response:</span>
          </div>
          <p className="text-sm text-[var(--ink)] leading-relaxed">
            {parseResponse(status.response)}
          </p>
          <a
            href={buildTxExplorerUrl(TARGET_CHAIN_ID, status.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
          >
            <ExternalLink size={11} /> View on explorer
          </a>
        </div>
      )}

      {status.phase === 'error' && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex gap-2">
          <AlertCircle size={14} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--danger)]">{status.message}</p>
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
        className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)] transition-colors"
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
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--ink)] display">All Endpoints</h2>
          <span className="text-xs text-[var(--muted)] tabular-nums bg-[var(--surface-muted)] px-2.5 py-1 rounded-full">
            {ids.length} registered
          </span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Pay USDC per API call. Any endpoint, any price, settled onchain.
        </p>
      </div>

      {!IS_CONTRACT_DEPLOYED && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Contract not deployed yet. Set <code className="font-mono">VITE_METER_REGISTRY_ADDRESS</code> after deployment.
          </p>
        </div>
      )}

      {endpointCount === undefined && IS_CONTRACT_DEPLOYED && (
        <div className="space-y-3">
          {([0, 1] as const).map(i => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--surface-muted)] animate-pulse" />
          ))}
        </div>
      )}

      {endpointCount !== undefined && ids.length === 0 && IS_CONTRACT_DEPLOYED && (
        <div className="text-center py-12 text-[var(--muted)] text-sm">
          No endpoints registered yet.
        </div>
      )}

      <div className="space-y-3">
        {ids.map(id => (
          <EndpointCard key={id.toString()} id={id} />
        ))}
      </div>
    </div>
  )
}
