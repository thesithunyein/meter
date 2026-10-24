import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { Target, Plus, ExternalLink, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { METER_REGISTRY_ADDRESS, METER_REGISTRY_ABI, IS_CONTRACT_DEPLOYED } from '@/contracts/meter-registry'
import { TARGET_CHAIN_ID } from '@/config'
import { parseAmount, Amount } from '@/onchain-money'
import { buildTxExplorerUrl } from '@/onchain-facts'

type Step = 'idle' | 'approving' | 'registering' | 'done'

function EndpointRow({ id, chainId }: { id: bigint; chainId: number }) {
  const { data } = useReadContract({
    address: METER_REGISTRY_ADDRESS,
    abi: METER_REGISTRY_ABI,
    functionName: 'endpoints',
    args: [id],
    chainId,
  })
  const { address } = useAccount()

  if (!data || data[0].toLowerCase() !== address?.toLowerCase()) return null

  const [, name, url, price, active] = data
  const formatted = Amount.fromRaw(price, 6).toFixed(4)

  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--ink)] truncate">{name}</p>
        <p className="text-xs text-[var(--muted)] truncate font-mono">{url}</p>
      </div>
      <span className="text-sm font-semibold text-[var(--ink)] tabular-nums whitespace-nowrap">
        {formatted} USDC
      </span>
      <span className="text-xs text-[var(--subtle)] tabular-nums">#{id.toString()}</span>
    </div>
  )
}

export default function ProviderPage() {
  const { chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [registerHash, setRegisterHash] = useState<`0x${string}` | undefined>()

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID

  const { data: endpointCount, refetch: refetchCount } = useReadContract({
    address: METER_REGISTRY_ADDRESS,
    abi: METER_REGISTRY_ABI,
    functionName: 'endpointCount',
    chainId: TARGET_CHAIN_ID,
  })

  const { writeContractAsync: register } = useWriteContract()

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: registerHash,
    onReplaced: () => toast.info('Transaction replaced'),
  })

  const { isSuccess: isRegistered } = useWaitForTransactionReceipt({ hash: registerHash })

  const handleRegister = useCallback(async () => {
    if (!isConnected) return
    if (isWrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (!name.trim() || !url.trim() || !price) return

    let parsed: ReturnType<typeof parseAmount>
    try {
      parsed = parseAmount(TARGET_CHAIN_ID, price)
    } catch {
      toast.error('Invalid price')
      return
    }
    if (parsed.raw === 0n) { toast.error('Price must be > 0'); return }

    try {
      setStep('registering')
      const hash = await register({
        address: METER_REGISTRY_ADDRESS,
        abi: METER_REGISTRY_ABI,
        functionName: 'register',
        args: [name.trim(), url.trim(), parsed.raw],
        chainId: TARGET_CHAIN_ID,
      })
      setRegisterHash(hash)
      setStep('done')
      toast.success('Endpoint registered!')
      void refetchCount()
    } catch (err: unknown) {
      setStep('idle')
      const msg = (err as Error)?.message ?? ''
      if (msg.includes('rejected') || msg.includes('denied')) {
        toast.info('Cancelled')
      } else {
        toast.error('Registration failed')
      }
    }
  }, [isConnected, isWrongChain, name, url, price, register, switchChain, refetchCount])

  const allIds = endpointCount
    ? Array.from({ length: Number(endpointCount) }, (_, i) => BigInt(i))
    : []

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-[var(--ink)] display">My Endpoints</h2>
        </div>
        <ConnectKitButton />
      </div>

      {!IS_CONTRACT_DEPLOYED && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Contract not deployed yet. Set <code className="font-mono">VITE_METER_REGISTRY_ADDRESS</code> after deployment.
          </p>
        </div>
      )}

      {isWrongChain && (
        <button
          onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
          className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold"
        >
          Switch to Arc Mainnet
        </button>
      )}

      {/* Register form */}
      {isConnected && !isWrongChain && (
        <div className="bg-[var(--surface)] backdrop-blur-sm border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-widest">
            Register Endpoint
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Endpoint name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
            <input
              type="url"
              placeholder="https://your-api.example.com/endpoint"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
            <div className="relative">
              <input
                type="number"
                placeholder="0.01"
                min="0"
                step="0.000001"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full px-3 py-2.5 pr-16 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)]">
                USDC
              </span>
            </div>
          </div>
          <button
            onClick={() => void handleRegister()}
            disabled={step !== 'idle' || !name || !url || !price}
            className="w-full py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)] transition-colors"
          >
            {step === 'registering' || isConfirming ? (
              <><Loader2 size={15} className="animate-spin" /> {isConfirming ? 'Confirming...' : 'Confirm in wallet...'}</>
            ) : step === 'done' && isRegistered ? (
              <><CheckCircle size={15} /> Registered!</>
            ) : (
              <><Plus size={15} /> Register Endpoint</>
            )}
          </button>
          {registerHash && (
            <a
              href={buildTxExplorerUrl(TARGET_CHAIN_ID, registerHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
            >
              <ExternalLink size={11} /> View transaction
            </a>
          )}
        </div>
      )}

      {!isConnected && (
        <div className="text-center py-8 text-[var(--muted)] text-sm">
          Connect your wallet to register and manage endpoints.
        </div>
      )}

      {/* My endpoints list */}
      {isConnected && allIds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest px-1">
            Your endpoints
          </p>
          {allIds.map(id => (
            <EndpointRow key={id.toString()} id={id} chainId={TARGET_CHAIN_ID} />
          ))}
        </div>
      )}
    </div>
  )
}
