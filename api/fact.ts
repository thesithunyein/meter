/**
 * Vercel Serverless Function: GET /api/fact
 *
 * Zero external dependencies — uses only Node built-ins (https).
 * Verifies an onchain Paid event via the Arc Mainnet JSON-RPC, then returns a random fact.
 *
 * Required env vars (Vercel dashboard → Settings → Environment Variables):
 *   VITE_METER_REGISTRY_ADDRESS  — deployed MeterRegistry address on Arc mainnet
 *   DEMO_ENDPOINT_ID             — endpoint ID this server owns (default "1")
 *
 * Optional env vars:
 *   RPC_PROXY_BASE_URL / RPC_PROXY_TOKEN / RPC_PROXY_CHAINS — if set and "Arc"
 *     is in CHAINS, uses the Arc Studio RPC proxy; otherwise falls back to the
 *     ARC_MAINNET_RPC_URL env var or the public Arc mainnet endpoint.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { request as httpsRequest } from 'https'

// ---------------------------------------------------------------------------
// Config — all values from environment, never hardcoded
// ---------------------------------------------------------------------------
const REGISTRY = (process.env.VITE_METER_REGISTRY_ADDRESS ?? '').toLowerCase()
const ENDPOINT_ID = BigInt(process.env.DEMO_ENDPOINT_ID ?? '1')

const PROXY_BASE = process.env.RPC_PROXY_BASE_URL
const PROXY_TOKEN = process.env.RPC_PROXY_TOKEN
const PROXY_CHAINS = (process.env.RPC_PROXY_CHAINS ?? '').split(',')
const PROXY_CHAIN_NAME = 'Arc'

function getRpcUrl(): string {
  if (PROXY_BASE && PROXY_TOKEN && PROXY_CHAINS.includes(PROXY_CHAIN_NAME)) {
    return `${PROXY_BASE}/api/rpc/${PROXY_CHAIN_NAME}?_rpc_token=${PROXY_TOKEN}`
  }
  // Fall back to env var set in Vercel dashboard (ARC_MAINNET_RPC_URL),
  // then to the user-specified drpc endpoint, then the canonical Arc mainnet RPC.
  return (
    process.env.ARC_MAINNET_RPC_URL ??
    'https://rpc.drpc.mainnet.arc.io' // arc-studio-allow-onchain-literal
  )
}

// Paid(address indexed caller, uint256 indexed endpointId, uint256 amount, uint256 nonce)
// keccak256("Paid(address,uint256,uint256,uint256)") — computed from ABI, stable.
const PAID_TOPIC =
  '0x1ff60751a354563b8db02f735046d6cecdd1ec33b27b453a7925da806b529adb' // arc-studio-allow-onchain-literal

const FACTS = [
  "A group of flamingos is called a 'flamboyance'.",
  'Honey never spoils — archaeologists found 3,000-year-old honey in Egyptian tombs, still edible.',
  'Octopuses have three hearts, blue blood, and can edit their own RNA.',
  'The shortest war in history lasted 38–45 minutes — the Anglo-Zanzibar War of 1896.',
  'A day on Venus is longer than a year on Venus.',
  'Bananas are berries, but strawberries are not.',
  'The Eiffel Tower grows about 15 cm taller in summer due to thermal expansion.',
  'Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.',
  'There are more possible chess games than atoms in the observable universe.',
  'Wombat droppings are cube-shaped — the only known animal to produce cube feces.',
  'A bolt of lightning contains enough energy to toast about 100,000 slices of bread.',
  'The human nose can detect about 1 trillion different smells.',
  "Scotland's national animal is the unicorn.",
  'Crows can recognize human faces and hold grudges.',
  "The wingspan of a Boeing 747 is longer than the Wright Brothers' first flight.",
]

// ---------------------------------------------------------------------------
// Replay guard (in-memory, resets on cold start)
// ---------------------------------------------------------------------------
const usedKeys = new Set<string>()

// ---------------------------------------------------------------------------
// Minimal JSON-RPC helper using only Node https built-in
// ---------------------------------------------------------------------------
function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const rpcUrl = getRpcUrl()
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    const url = new URL(rpcUrl)
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = httpsRequest(options, res => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString()) as {
            result?: unknown
            error?: { message?: string }
          }
          if (parsed.error) reject(new Error(parsed.error.message ?? 'RPC error'))
          else resolve(parsed.result)
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ---------------------------------------------------------------------------
// Payment verification
// ---------------------------------------------------------------------------
async function verifyPayment(txHash: string, endpointId: bigint): Promise<boolean> {
  if (!REGISTRY || REGISTRY.length < 10) return false

  const key = `${txHash.toLowerCase()}-${endpointId.toString()}`
  if (usedKeys.has(key)) return false

  // Fetch receipt — contains logs inline, no extra eth_getLogs call needed
  const receipt = (await rpcCall('eth_getTransactionReceipt', [txHash])) as {
    status: string
    logs: Array<{
      address: string
      topics: string[]
      transactionHash: string
    }>
  } | null

  if (!receipt || receipt.status !== '0x1') return false

  // topics[1] = indexed caller (address, padded to 32 bytes)
  // topics[2] = indexed endpointId (uint256, padded to 32 bytes)
  const endpointIdHex = '0x' + endpointId.toString(16).padStart(64, '0')

  const match = receipt.logs.find(log => {
    if (log.address.toLowerCase() !== REGISTRY) return false
    if (log.transactionHash?.toLowerCase() !== txHash.toLowerCase()) return false
    if (log.topics[0]?.toLowerCase() !== PAID_TOPIC.toLowerCase()) return false
    if (log.topics[2]?.toLowerCase() !== endpointIdHex.toLowerCase()) return false
    return true
  })

  if (!match) return false

  usedKeys.add(key)
  return true
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'x-payment-tx, x-chain-id, content-type',
}

function json(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' })
  res.end(payload)
}

// ---------------------------------------------------------------------------
// Handler — plain Node http types (Vercel Node runtime, no @vercel/node needed)
// ---------------------------------------------------------------------------
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    res.end()
    return
  }

  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  const txHash = req.headers['x-payment-tx'] as string | undefined

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    json(res, 402, {
      error: 'Payment required',
      detail: 'Include x-payment-tx header with a valid 32-byte transaction hash',
    })
    return
  }

  let valid = false
  try {
    valid = await verifyPayment(txHash, ENDPOINT_ID)
  } catch (e) {
    console.error('[meter/fact] verifyPayment error:', e)
    json(res, 500, { error: 'Payment verification failed', detail: String(e) })
    return
  }

  if (!valid) {
    json(res, 402, {
      error: 'Payment not verified',
      detail:
        'Transaction does not contain a valid Paid event for this endpoint, or has already been used.',
    })
    return
  }

  const fact = FACTS[Math.floor(Math.random() * FACTS.length)]
  json(res, 200, { fact })
}
