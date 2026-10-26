/**
 * Demo "random fact" endpoint server.
 *
 * This backend:
 *   1. Listens for GET /api/fact
 *   2. Verifies the x-payment-tx header contains a real Paid event
 *      with endpointId matching DEMO_ENDPOINT_ID and caller matching the tx sender.
 *   3. Returns a random fact on success, 402 on missing/invalid payment.
 *
 * Run: bun server/index.ts
 * Required env: VITE_METER_REGISTRY_ADDRESS, DEMO_ENDPOINT_ID (default 1)
 */

import { createPublicClient, http, parseAbiItem } from 'viem'
import { arc } from 'viem/chains'
import { join } from 'path'
import { existsSync } from 'fs'

const PORT = Number(process.env.PORT ?? 3001)

const METER_REGISTRY_ADDRESS = (process.env.VITE_METER_REGISTRY_ADDRESS ?? '') as `0x${string}`
const DEMO_ENDPOINT_ID = BigInt(process.env.DEMO_ENDPOINT_ID ?? '1')

// Resolve RPC: prefer the Arc Studio proxy, fall back to the public Arc mainnet RPC
const proxyBase = process.env.RPC_PROXY_BASE_URL
const proxyToken = process.env.RPC_PROXY_TOKEN
const proxyChains = (process.env.RPC_PROXY_CHAINS ?? '').split(',')
const ARC_PROXY_CHAIN = 'Arc'

function buildRpcUrl(): string {
  if (proxyBase && proxyToken && proxyChains.includes(ARC_PROXY_CHAIN)) {
    return `${proxyBase}/api/rpc/${ARC_PROXY_CHAIN}?_rpc_token=${proxyToken}`
  }
  // Fall back to public Arc mainnet RPC from the viem chain definition
  const fallback = arc.rpcUrls.default.http[0]
  if (!fallback) throw new Error('No RPC URL available for Arc mainnet')
  return fallback
}

const PAID_EVENT = parseAbiItem(
  'event Paid(address indexed caller, uint256 indexed endpointId, uint256 amount, uint256 nonce)',
)

let clientInstance: ReturnType<typeof createPublicClient> | null = null
function getClient() {
  if (!clientInstance) {
    clientInstance = createPublicClient({
      chain: arc,
      transport: http(buildRpcUrl()),
    })
  }
  return clientInstance
}

const FACTS = [
  "A group of flamingos is called a 'flamboyance'.",
  "Honey never spoils — archaeologists found 3000-year-old honey in Egyptian tombs, still edible.",
  "Octopuses have three hearts, blue blood, and can edit their own RNA.",
  "The shortest war in history lasted 38 to 45 minutes — Anglo-Zanzibar War, 1896.",
  "A day on Venus is longer than a year on Venus.",
  "Bananas are berries, but strawberries are not.",
  "The Eiffel Tower grows about 15 cm taller in summer due to thermal expansion.",
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  "There are more possible iterations of a game of chess than there are atoms in the observable universe.",
  "Wombat droppings are cube-shaped — the only known animal to produce cube feces.",
  "A bolt of lightning contains enough energy to toast about 100,000 slices of bread.",
  "The human nose can detect about 1 trillion different smells.",
  "Scotland's national animal is the unicorn.",
  "Crows can recognize human faces and hold grudges.",
  "The wingspan of a Boeing 747 is longer than the Wright Brothers' first flight.",
]

// Track used payment keys to prevent replay attacks: txHash + endpointId
const usedPaymentKeys = new Set<string>()

async function verifyPayment(txHash: string, expectedEndpointId: bigint): Promise<boolean> {
  if (!METER_REGISTRY_ADDRESS || METER_REGISTRY_ADDRESS.length < 10) return false

  const paymentKey = `${txHash.toLowerCase()}-${expectedEndpointId.toString()}`
  if (usedPaymentKeys.has(paymentKey)) {
    console.log('[meter] Replay attempt blocked:', paymentKey)
    return false
  }

  try {
    const c = getClient()
    const receipt = await c.getTransactionReceipt({ hash: txHash as `0x${string}` })
    if (!receipt || receipt.status !== 'success') return false

    const logs = await c.getLogs({
      address: METER_REGISTRY_ADDRESS,
      event: PAID_EVENT,
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    })

    const match = logs.find(
      l =>
        l.transactionHash?.toLowerCase() === txHash.toLowerCase() &&
        l.args.endpointId === expectedEndpointId,
    )

    if (!match) return false

    usedPaymentKeys.add(paymentKey)
    return true
  } catch (e) {
    console.error('[meter] Payment verification error:', e)
    return false
  }
}

const DIST_DIR = join(import.meta.dir, '../dist')
const IS_PROD = process.env.NODE_ENV === 'production' || existsSync(DIST_DIR + '/index.html')

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'x-payment-tx, x-chain-id, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, endpointId: DEMO_ENDPOINT_ID.toString() }, { headers: corsHeaders })
    }

    if (url.pathname === '/api/fact') {
      const txHash = req.headers.get('x-payment-tx')

      if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
        return Response.json(
          { error: 'Payment required', detail: 'Include x-payment-tx header with a valid transaction hash' },
          { status: 402, headers: corsHeaders },
        )
      }

      const valid = await verifyPayment(txHash, DEMO_ENDPOINT_ID)
      if (!valid) {
        return Response.json(
          {
            error: 'Payment not verified',
            detail:
              'Transaction does not contain a valid Paid event for this endpoint, or has already been used.',
          },
          { status: 402, headers: corsHeaders },
        )
      }

      const fact = FACTS[Math.floor(Math.random() * FACTS.length)]
      return Response.json({ fact }, { headers: corsHeaders })
    }

    // Serve built Vite app in production mode
    if (IS_PROD) {
      const filePath = join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname)
      const file = Bun.file(filePath)
      if (await file.exists()) return new Response(file)
      // SPA fallback
      return new Response(Bun.file(join(DIST_DIR, 'index.html')))
    }

    return new Response('Not found', { status: 404, headers: corsHeaders })
  },
})

console.log(`[meter] Random fact server on http://localhost:${PORT}`)
console.log(`[meter] Registry: ${METER_REGISTRY_ADDRESS || '(not set — set VITE_METER_REGISTRY_ADDRESS)'}`)
console.log(`[meter] Demo endpoint ID: ${DEMO_ENDPOINT_ID.toString()}`)
