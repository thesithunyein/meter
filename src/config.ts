/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arc } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arc.id, arc.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arc, mainnet], // mainnet included for ENS resolution
  connectors: [injected()],
  transports: {
    [arc.id]: http(),
    [mainnet.id]: http(),
  },
})

export { arc as targetChain }
export const TARGET_CHAIN_ID = arc.id
