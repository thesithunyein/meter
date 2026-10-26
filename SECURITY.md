# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| Latest (`main`) | Yes |
| Older commits | No |

## Scope

This policy covers:

- **`contracts/MeterRegistry.sol`** — the deployed smart contract at `0x423B8701Da3a251a3A3fc2d241b71e8d05744C91` on Arc Mainnet
- **`api/fact.ts`** — the payment-verification serverless function
- **`src/`** — the frontend application at [getmeter.vercel.app](https://getmeter.vercel.app)

Out of scope:

- Third-party dependencies (report upstream)
- Arc network / USDC contract issues (report to Circle)
- Issues requiring physical access to a user's device
- Social engineering

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately by emailing the repository owner via GitHub's private vulnerability reporting feature:

1. Go to [github.com/thesithunyein/meter/security/advisories/new](https://github.com/thesithunyein/meter/security/advisories/new)
2. Provide a clear description, reproduction steps, and your assessment of impact
3. Include any proof-of-concept code (do not exploit live contracts)

You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 days**.

## Smart contract considerations

The `MeterRegistry` contract is **immutable** — there is no owner, no admin key, and no upgrade mechanism. A critical vulnerability in the contract cannot be patched without deploying a new contract and migrating providers. This is a known tradeoff for full permissionlessness.

If you discover a critical vulnerability:

1. Do **not** exploit it on mainnet
2. Report it privately as above
3. A new contract will be deployed and all registered providers will be notified

## Known design tradeoffs

| Issue | Mitigation |
|---|---|
| Provider address blocklisted by Circle | Provider can call `deactivate()` to stop callers hitting a permanently-failing endpoint |
| No price update mechanism | Providers deactivate and re-register at a new price |
| Endpoint URL stored onchain | URLs are public by design — do not register private URLs |
| Payment replay | The `/api/fact` gate tracks used tx hashes in memory; stateless serverless deployments should use a persistent store for production use |

## Audit status

The contract was reviewed using automated analysis and manual review prior to mainnet deployment. No critical or high findings remain unresolved. The full audit trail is in [AGENTS.md](AGENTS.md).
