# Meter — Pay-per-Call API Gateway

> Built with Arc Studio - money-powered apps in minutes

Pay-per-call API marketplace on Arc mainnet. Providers register HTTP endpoints with a USDC price; callers pay per call onchain; payment proof gates endpoint responses.

---

## Contract
- **Name**: MeterRegistry
- **Source**: `contracts/MeterRegistry.sol`
- **Deploy script**: `contracts/script/DeployMeterRegistry.s.sol:DeployMeterRegistry`
- **Network**: Arc mainnet (chainId 5042)
- **USDC**: `0x3600000000000000000000000000000000000000` (6 decimals, from onchain-facts)
- **Deployed address**: NOT YET DEPLOYED — user deploys from their own wallet. After deploy, set `VITE_METER_REGISTRY_ADDRESS` in `.env`.

## App Structure
- `src/components/PublicPage.tsx` — browse all endpoints, pay per call, see response
- `src/components/ProviderPage.tsx` — connect wallet, register endpoint, list own endpoints
- `src/components/LiveFeed.tsx` — real-time stream of Paid events
- `src/contracts/meter-registry.ts` — contract address + ABI (update address post-deploy)
- `server/index.ts` — Bun demo server, port 3001: verifies Paid event onchain, returns random fact
- Vite proxy: `/api/*` → `localhost:3001`

## Audit Findings (resolved)
1. Constructor zero-address — fixed (`ZeroAddress` revert)
2. Arc USDC blocklisted provider bricks endpoint — mitigated (`deactivate()` + `EndpointInactive`)

## Tests
- 22 tests, all pass — `contracts/test/MeterRegistry.t.sol`

## Audit Provenance
| Subagent | Dispatched | Files audited | Corpus rules cited |
|---|---|---|---|
| solidity-auditor | yes | 2 | insufficient-constructor-parameter-validation |
| functional-auditor | yes | 1 | blocklisted-provider-can-brick-endpoint-payments |
