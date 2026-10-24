/**
 * One-time script: registers the "random fact" demo endpoint on MeterRegistry.
 *
 * Usage:
 *   bun run scripts/register-demo-endpoint.ts
 *
 * Requires CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env (set up via Arc Studio
 * "Get test USDC" or the self-deploy credential flow).
 *
 * The script:
 *  1. Creates a throwaway DCW wallet on Arc Testnet
 *  2. Drips testnet USDC to fund gas
 *  3. Calls register("random fact", "/api/fact", 10000) on MeterRegistry
 *     price 10000 = 0.01 USDC (6 decimals)
 *  4. Prints the endpointId to add to .env as DEMO_ENDPOINT_ID
 */

import {
  initiateDeveloperControlledWalletsClient,
} from '@circle-fin/developer-controlled-wallets'
import { buildTxExplorerUrl } from '../src/onchain-facts.ts'
import { waitForSuccessfulTransaction } from '../src/onchain-wait.ts'

const CHAIN = 'ARC-TESTNET' as const
const ARC_TESTNET_CHAIN_ID = 5042002
const REGISTRY = '0x63d52ea2f47b2db6edba7bb6f33c5abc1e81d2f9'
// price: 0.01 USDC = 10_000 raw units (6 decimals)
const PRICE_RAW = '10000'
const ENDPOINT_NAME = 'random fact'
// URL is relative — works locally; replace with your deployed server URL for production
const ENDPOINT_URL = '/api/fact'

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY ?? process.env.CIRCLE_DEVELOPER_CONTROLLED_API_KEY
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET ?? process.env.ENTITY_SECRET ?? process.env.CIRCLE_SCP_ENTITY_SECRET

  if (!apiKey || !entitySecret) {
    console.error('CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set in .env')
    process.exit(1)
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret })

  console.log('Creating wallet set...')
  const ws = await client.createWalletSet({ name: 'meter-demo-seed' })
  const walletSetId = ws.data?.walletSet?.id ?? (() => { throw new Error('No walletSetId returned') })()

  console.log('Creating wallet...')
  const walletRes = await client.createWallets({
    walletSetId,
    blockchains: [CHAIN],
    count: 1,
  })
  const wallet = walletRes.data?.wallets?.[0] ?? (() => { throw new Error('No wallet returned') })()
  console.log('Wallet:', wallet.address, 'ID:', wallet.id)

  console.log('Requesting testnet USDC...')
  await client.requestTestnetTokens({ address: wallet.address, blockchain: CHAIN })
  // Allow a few seconds for the drip to land
  await new Promise(r => setTimeout(r, 8000))

  console.log('Calling register() on MeterRegistry...')
  const tx = await client.createContractExecutionTransaction({
    walletId: wallet.id,
    contractAddress: REGISTRY,
    abiFunctionSignature: 'register(string,string,uint256)',
    abiParameters: [ENDPOINT_NAME, ENDPOINT_URL, PRICE_RAW],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })
  const txId = tx.data?.id ?? (() => { throw new Error('No txId returned') })()
  console.log('Tx submitted, waiting for confirmation...')

  const txFinal = await waitForSuccessfulTransaction(
    () => client.getTransaction({ id: txId }),
    (res) => res.data?.transaction?.state,
    { label: 'register()', timeoutMs: 60_000 },
  )
  const txHash = txFinal.data?.transaction?.txHash ?? ''
  console.log('Confirmed. txHash:', txHash)
  console.log('Explorer:', buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, txHash))
  console.log('\nEndpoint registered as endpoint ID 0.')
  console.log('Add to .env:  DEMO_ENDPOINT_ID=0\n')
}

void main()
