# Meter — Pay-per-Call API Gateway

> Built with Arc Studio - money-powered apps in minutes

Pay-per-call API marketplace on Arc mainnet. Providers register HTTP endpoints with a USDC price; callers pay per call onchain; payment proof gates endpoint responses.

---

## Deployments
- **Live app**: https://getmeter.vercel.app
- **GitHub**: https://github.com/thesithunyein/meter

## Contract
- **Name**: MeterRegistry
- **Source**: `contracts/MeterRegistry.sol`
- **Deploy script**: `contracts/script/DeployMeterRegistry.s.sol:DeployMeterRegistry`
- **Network**: Arc mainnet (chainId 5042)
- **USDC**: `0x3600000000000000000000000000000000000000` (6 decimals, from onchain-facts)
- **Deployed address (mainnet)**: `0x423B8701Da3a251a3A3fc2d241b71e8d05744C91`
- **Demo endpoint**: ID `1`, name `random fact`, price `0.01 USDC`, URL `/api/fact`
- **Arc Testnet address**: `0x63d52ea2f47b2db6edba7bb6f33c5abc1e81d2f9` (chain 5042002)

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
