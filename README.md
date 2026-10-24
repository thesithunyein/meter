# Meter — Pay-per-Call API Gateway

A permissionless onchain API marketplace where providers register HTTP endpoints with a USDC price, and callers pay per call. Payment proof flows directly from the blockchain to the endpoint: no intermediary, no escrow, no trust needed.

Built with [Arc Studio](https://studio.arc.io)

## Tech Stack

- **Smart contract**: Solidity 0.8.28, Foundry, OpenZeppelin 5.6.1
- **Chain**: Arc mainnet (USDC as native gas token)
- **Frontend**: React + TypeScript + Vite, wagmi v2, ConnectKit, viem
- **Backend demo endpoint**: Bun HTTP server

## App Views

- **Endpoints** — browse all registered endpoints and pay per call in USDC
- **My APIs** — connect wallet, register a new endpoint (name, URL, price), see your own listings
- **Live Feed** — real-time stream of all `Paid` events from the contract

## Contract: MeterRegistry

The contract is intentionally minimal: no owner, admin, fee, or pause. USDC flows directly caller to provider via `transferFrom`.

Key functions:
- `register(name, url, price)` — register an endpoint; returns `endpointId`
- `pay(endpointId)` — transfers USDC from caller to provider, emits `Paid(caller, endpointId, amount, nonce)`
- `deactivate(endpointId)` — provider can disable their own endpoint

## Deploy the Contract

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) installed
- An Arc mainnet wallet with USDC for gas

### Build

```bash
forge build
```

### Deploy to Arc Mainnet

```bash
export PRIVATE_KEY=0x...   # your deployer private key — never commit this

forge script contracts/script/DeployMeterRegistry.s.sol:DeployMeterRegistry \
  --rpc-url https://rpc.mainnet.arc.io \
  --broadcast \
  --private-key $PRIVATE_KEY
```

The script prints the deployed address. Copy it, then:

```bash
# Add to .env
echo 'VITE_METER_REGISTRY_ADDRESS=0xYourDeployedAddress' >> .env
```

### Register the Demo "Random Fact" Endpoint

After deploying, register the built-in demo endpoint via the app's **My APIs** tab, or directly via Forge:

- **Name**: `random fact`
- **URL**: `http://localhost:3001/api/fact` (or your public server URL)
- **Price**: `10000` (= 0.01 USDC, 6 decimals)

Note the returned `endpointId` and add it to `.env`:

```bash
echo 'DEMO_ENDPOINT_ID=0' >> .env   # replace 0 with actual id
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) v1+
- [Foundry](https://book.getfoundry.sh/)
- Node.js 20+

### Install

```bash
bun install
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_METER_REGISTRY_ADDRESS` | Deployed MeterRegistry contract address (set after deploy) |
| `DEMO_ENDPOINT_ID` | Endpoint ID of the "random fact" demo (default: `0`) |
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL (optional outside Arc Studio) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token (optional outside Arc Studio) |
| `RPC_PROXY_CHAINS` | Comma-separated proxy chain keys (optional outside Arc Studio) |

### Run Frontend Only

```bash
bun run dev
```

### Run Backend Demo Endpoint

```bash
bun run server
```

### Run Both Together

```bash
bun run start
```

### Run Contract Tests

```bash
forge test
```

## Security Notes

- Providers can deactivate their own endpoint if their address becomes compromised or blocklisted.
- The demo backend verifies payment by checking the `Paid` event onchain and blocks replay attacks per `txHash + endpointId`.
- The contract holds zero funds at any time; USDC transfers go directly caller to provider.
- This project passed a thorough internal security review. For production use with significant value, commission an independent professional audit before deployment.
