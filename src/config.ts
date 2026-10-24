/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arcTestnet, mainnet], // mainnet included for ENS resolution
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
    [mainnet.id]: http(),
  },
})

export { arcTestnet as targetChain }
export const TARGET_CHAIN_ID = arcTestnet.id
