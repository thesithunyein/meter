/**
 * Vercel Serverless Function: GET /api/fact
 *
 * Verifies an onchain Paid event then returns a random fact.
 * The MeterRegistry endpoint URL registered onchain is "/api/fact", which
 * Vercel routes to this file at runtime.
 *
 * Required env vars (set in Vercel dashboard):
 *   VITE_METER_REGISTRY_ADDRESS  — deployed MeterRegistry address
 *   DEMO_ENDPOINT_ID             — endpoint ID this server owns (default "0")
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arcTestnet } from 'viem/chains'

const METER_REGISTRY_ADDRESS = (process.env.VITE_METER_REGISTRY_ADDRESS ?? '') as `0x${string}`
const DEMO_ENDPOINT_ID = BigInt(process.env.DEMO_ENDPOINT_ID ?? '0')

const PAID_EVENT = parseAbiItem(
  'event Paid(address indexed caller, uint256 indexed endpointId, uint256 amount, uint256 nonce)',
)

const FACTS = [
  "A group of flamingos is called a 'flamboyance'.",
  'Honey never spoils — archaeologists found 3000-year-old honey in Egyptian tombs, still edible.',
  'Octopuses have three hearts, blue blood, and can edit their own RNA.',
  'The shortest war in history lasted 38 to 45 minutes — Anglo-Zanzibar War, 1896.',
  'A day on Venus is longer than a year on Venus.',
  'Bananas are berries, but strawberries are not.',
  'The Eiffel Tower grows about 15 cm taller in summer due to thermal expansion.',
  'Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.',
  'There are more possible iterations of a game of chess than there are atoms in the observable universe.',
  'Wombat droppings are cube-shaped — the only known animal to produce cube feces.',
  'A bolt of lightning contains enough energy to toast about 100,000 slices of bread.',
  'The human nose can detect about 1 trillion different smells.',
  "Scotland's national animal is the unicorn.",
  'Crows can recognize human faces and hold grudges.',
  "The wingspan of a Boeing 747 is longer than the Wright Brothers' first flight.",
]

// In-memory replay guard — resets on cold start, good enough for demo
const usedKeys = new Set<string>()

async function verifyPayment(txHash: string, endpointId: bigint): Promise<boolean> {
  if (!METER_REGISTRY_ADDRESS || METER_REGISTRY_ADDRESS.length < 10) return false

  const key = `${txHash.toLowerCase()}-${endpointId.toString()}`
  if (usedKeys.has(key)) return false

  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(), // uses arcTestnet.rpcUrls.default.http[0] from viem
  })

  const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })
  if (!receipt || receipt.status !== 'success') return false

  const logs = await client.getLogs({
    address: METER_REGISTRY_ADDRESS,
    event: PAID_EVENT,
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  })

  const match = logs.find(
    l =>
      l.transactionHash?.toLowerCase() === txHash.toLowerCase() &&
      l.args.endpointId === endpointId,
  )
  if (!match) return false

  usedKeys.add(key)
  return true
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'x-payment-tx, x-chain-id, content-type',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).set(cors).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).set(cors).json({ error: 'Method not allowed' })
    return
  }

  const txHash = req.headers['x-payment-tx'] as string | undefined

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    res.status(402).set(cors).json({
      error: 'Payment required',
      detail: 'Include x-payment-tx header with a valid transaction hash',
    })
    return
  }

  let valid = false
  try {
    valid = await verifyPayment(txHash, DEMO_ENDPOINT_ID)
  } catch (e) {
    console.error('[meter] verifyPayment error:', e)
    res.status(500).set(cors).json({ error: 'Payment verification failed' })
    return
  }

  if (!valid) {
    res.status(402).set(cors).json({
      error: 'Payment not verified',
      detail: 'Transaction does not contain a valid Paid event for this endpoint, or has already been used.',
    })
    return
  }

  const fact = FACTS[Math.floor(Math.random() * FACTS.length)]
  res.status(200).set(cors).json({ fact })
}
