<div align="center">

<svg width="120" height="120" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mg-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#5B8DEF"/>
      <stop offset="50%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#22D3EE"/>
    </linearGradient>
  </defs>
  <path d="M 6 34 L 6 10 Q 6 6 10 6 L 12 6 L 20 22 L 28 6 L 30 6 Q 34 6 34 10 L 34 34"
    stroke="url(#mg-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 10 34 L 10 13 L 20 27 L 30 13 L 30 34"
    stroke="url(#mg-grad)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>
</svg>

# Meter

**Pay-per-call API gateway — USDC settles every request, onchain.**

[![Live](https://img.shields.io/badge/live-getmeter.vercel.app-22D3EE?style=flat-square&logo=vercel&logoColor=white)](https://getmeter.vercel.app)
[![Contract](https://img.shields.io/badge/contract-Arc%20Mainnet-5B8DEF?style=flat-square)](https://explorer.arc.io/address/0x423B8701Da3a251a3A3fc2d241b71e8d05744C91)
[![Solidity](https://img.shields.io/badge/solidity-%5E0.8.28-363636?style=flat-square&logo=solidity)](contracts/MeterRegistry.sol)
[![Tests](https://img.shields.io/badge/tests-22%2F22%20passing-22c55e?style=flat-square&logo=checkmarx&logoColor=white)](contracts/test/MeterRegistry.t.sol)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

Built with [Arc Studio](https://studio.arc.io)

</div>

---

## Overview

Meter is a permissionless, onchain API marketplace. Any HTTP endpoint can be monetized with a USDC price. Callers pay per request — the smart contract is the auth layer. No API keys. No accounts. No billing portals.

```
Provider                  MeterRegistry                  Caller
   │                           │                            │
   │── register(name,url,price)──▶│                            │
   │◀──── endpointId ────────────│                            │
   │                           │                            │
   │                           │◀── approve(registry, price) ──│
   │                           │◀────── pay(endpointId) ───────│
   │◀────────── USDC ───────────│                            │
   │                           │────── emit Paid(tx) ──────▶│
   │                           │                            │
   │◀── GET /url { x-payment-tx: txHash } ─────────────────│
   │────────────── response ───────────────────────────────▶│
```

USDC flows **directly from caller to provider** in a single transaction. The contract never holds funds.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    getmeter.vercel.app               │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Landing     │  │  Endpoints   │  │  My APIs  │ │
│  │  Page        │  │  (PublicPage)│  │ (Provider)│ │
│  └──────────────┘  └──────┬───────┘  └─────┬─────┘ │
│                           │                │        │
│  ┌────────────────────────▼────────────────▼──────┐ │
│  │           wagmi v2 + ConnectKit (EVM wallet)   │ │
│  └────────────────────────┬───────────────────────┘ │
│                           │                         │
│  ┌────────────────────────▼───────────────────────┐ │
│  │         Vercel Serverless  /api/fact            │ │
│  │   • verifies x-payment-tx against Arc mainnet  │ │
│  │   • blocks replay attacks per txHash+caller    │ │
│  │   • returns response on valid payment proof    │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │   MeterRegistry.sol — Arc Mainnet  │
         │   0x423B8701...4C91                │
         │                                   │
         │  register(name, url, price)        │
         │  pay(endpointId)                   │
         │  deactivate(endpointId)            │
         │                                   │
         │  event Registered(...)             │
         │  event Paid(caller, id, amt, nonce)│
         └───────────────────────────────────┘
```

### Key design decisions

| Decision | Rationale |
|---|---|
| No fund custody | USDC transfers directly caller → provider via `transferFrom`. Zero protocol risk. |
| No owner / admin | Fully immutable after deploy. No rug vector, no upgrade key. |
| `active` flag on endpoints | Allows providers to disable listings if their address is blocklisted by Circle. |
| Nonce per endpoint | Each `Paid` event carries an incrementing nonce — uniquely identifies each call within an endpoint's history. |
| Serverless payment gate | `/api/fact` reads the `Paid` event from Arc mainnet via raw JSON-RPC. No Node dependencies — zero cold-start bundling issues on Vercel. |

---

## Smart Contract

**Address:** [`0x423B8701Da3a251a3A3fc2d241b71e8d05744C91`](https://explorer.arc.io/address/0x423B8701Da3a251a3A3fc2d241b71e8d05744C91)
**Network:** Arc Mainnet (chain ID `5042`)
**USDC:** [`0x3600000000000000000000000000000000000000`](https://explorer.arc.io/address/0x3600000000000000000000000000000000000000)

### Interface

```solidity
// Register an endpoint
function register(
    string calldata name,
    string calldata url,
    uint256 price          // USDC amount in 6-decimal units
) external returns (uint256 endpointId);

// Pay for a call — transfers USDC caller → provider
function pay(uint256 endpointId) external;

// Provider disables their own endpoint
function deactivate(uint256 endpointId) external;

// Events
event Registered(address indexed provider, uint256 indexed endpointId, string name, string url, uint256 price);
event Paid(address indexed caller, uint256 indexed endpointId, uint256 amount, uint256 nonce);
event Deactivated(address indexed provider, uint256 indexed endpointId);
```

### Custom errors

| Error | When |
|---|---|
| `ZeroPrice()` | `register()` called with `price == 0` |
| `ZeroAddress()` | Constructor called with zero USDC address |
| `EndpointNotFound()` | `pay()` / `deactivate()` called with out-of-range ID |
| `EndpointInactive()` | `pay()` called on a deactivated endpoint |
| `NotProvider()` | `deactivate()` called by non-provider |
| `PaymentFailed()` | `transferFrom` returned `false` |

---

## Endpoint Payment Flow (callers)

```typescript
// 1. Approve USDC once (or per-call for tighter allowances)
await walletClient.writeContract({
  address: USDC,
  abi: erc20Abi,
  functionName: 'approve',
  args: [METER_REGISTRY, price],
})

// 2. Pay — USDC moves in this tx
const txHash = await walletClient.writeContract({
  address: METER_REGISTRY,
  abi: meterRegistryAbi,
  functionName: 'pay',
  args: [endpointId],
})

// 3. Call the endpoint with tx hash as proof
const res = await fetch(endpointUrl, {
  headers: { 'x-payment-tx': txHash },
})
const data = await res.json()
```

---

## Endpoint Payment Gate (providers)

To protect your endpoint, verify the `Paid` event onchain before responding:

```typescript
// Verify payment — pseudocode; see api/fact.ts for full Node built-ins implementation
async function verifyPayment(txHash: string, endpointId: number, expectedCaller: string) {
  const receipt = await rpc('eth_getTransactionReceipt', [txHash])
  const paidTopic = keccak256('Paid(address,uint256,uint256,uint256)')

  const log = receipt.logs.find(l =>
    l.address.toLowerCase() === METER_REGISTRY.toLowerCase() &&
    l.topics[0] === paidTopic &&
    BigInt(l.topics[2]) === BigInt(endpointId) &&
    l.topics[1].endsWith(expectedCaller.slice(2).toLowerCase())
  )

  if (!log) throw new Error('Payment not found')
  return true
}
```

---

## Development

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Foundry](https://book.getfoundry.sh) (for contract work)
- An EVM wallet with USDC on Arc Mainnet

### Install

```bash
git clone https://github.com/thesithunyein/meter
cd meter
bun install
```

### Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `VITE_METER_REGISTRY_ADDRESS` | Deployed MeterRegistry contract address | Yes |
| `DEMO_ENDPOINT_ID` | Endpoint ID for the `/api/fact` demo endpoint | Yes |
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL | Optional (Arc Studio only) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token | Optional (Arc Studio only) |
| `RPC_PROXY_CHAINS` | Comma-separated proxy chain keys | Optional (Arc Studio only) |

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

### Run locally

```bash
# Start the API server (port 3001)
bun run server

# Start the frontend dev server (port 5173)
bun run dev
```

### Build

```bash
bun run build
```

### Test

```bash
# Run all Foundry tests
forge test -v

# Run with gas report
forge test --gas-report
```

### Lint & typecheck

```bash
bun run check
```

---

## Deploying the contract

```bash
export PRIVATE_KEY=0x...

forge script contracts/script/DeployMeterRegistry.s.sol:DeployMeterRegistry \
  --rpc-url https://rpc.mainnet.arc.io \
  --broadcast \
  --private-key $PRIVATE_KEY
```

After deploy, set `VITE_METER_REGISTRY_ADDRESS` in your environment and redeploy the frontend.

---

## Project structure

```
meter/
├── api/
│   └── fact.ts              # Vercel serverless function — payment-gated endpoint
├── contracts/
│   ├── MeterRegistry.sol    # Core registry contract
│   ├── script/
│   │   └── DeployMeterRegistry.s.sol
│   └── test/
│       └── MeterRegistry.t.sol
├── server/
│   └── index.ts             # Bun dev server (local equivalent of /api/fact)
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── EndpointCard.tsx
│   │   ├── HeroCard.tsx
│   │   ├── LandingPage.tsx
│   │   ├── LiveFeed.tsx
│   │   ├── MeterLogo.tsx
│   │   ├── ProviderPage.tsx
│   │   └── PublicPage.tsx
│   ├── contracts/
│   │   └── meter-registry.ts
│   ├── onchain-facts.ts
│   ├── onchain-money.ts
│   └── onchain-wait.ts
└── vercel.json
```

---

## Contributing

Pull requests are welcome. For substantial changes, open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a pull request

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure policy.

---

## License

[MIT](LICENSE)
