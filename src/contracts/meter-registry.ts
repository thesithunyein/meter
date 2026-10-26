/**
 * MeterRegistry contract config.
 * Arc Mainnet deployment: 0x423B8701Da3a251a3A3fc2d241b71e8d05744C91
 * Arc Testnet deployment: 0x63d52ea2f47b2db6edba7bb6f33c5abc1e81d2f9 (legacy)
 */

// Arc Mainnet deployment (Oct 2026) — override via VITE_METER_REGISTRY_ADDRESS in .env
const DEPLOYED_ADDRESS = '0x423B8701Da3a251a3A3fc2d241b71e8d05744C91' as const

export const METER_REGISTRY_ADDRESS: `0x${string}` =
  (import.meta.env.VITE_METER_REGISTRY_ADDRESS as `0x${string}` | undefined) ??
  DEPLOYED_ADDRESS

export const IS_CONTRACT_DEPLOYED = true

export const METER_REGISTRY_ABI = [
  // Events
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'provider', type: 'address', indexed: true },
      { name: 'endpointId', type: 'uint256', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'url', type: 'string', indexed: false },
      { name: 'price', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Paid',
    inputs: [
      { name: 'caller', type: 'address', indexed: true },
      { name: 'endpointId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'nonce', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Deactivated',
    inputs: [
      { name: 'provider', type: 'address', indexed: true },
      { name: 'endpointId', type: 'uint256', indexed: true },
    ],
  },
  // Errors
  { type: 'error', name: 'ZeroPrice', inputs: [] },
  { type: 'error', name: 'ZeroAddress', inputs: [] },
  { type: 'error', name: 'EndpointNotFound', inputs: [] },
  { type: 'error', name: 'EndpointInactive', inputs: [] },
  { type: 'error', name: 'NotProvider', inputs: [] },
  { type: 'error', name: 'PaymentFailed', inputs: [] },
  // Read
  {
    type: 'function',
    name: 'usdc',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'endpointCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'endpoints',
    stateMutability: 'view',
    inputs: [{ name: 'endpointId', type: 'uint256' }],
    outputs: [
      { name: 'provider', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'url', type: 'string' },
      { name: 'price', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: 'endpointId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Write
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'url', type: 'string' },
      { name: 'price', type: 'uint256' },
    ],
    outputs: [{ name: 'endpointId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'pay',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'endpointId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'deactivate',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'endpointId', type: 'uint256' }],
    outputs: [],
  },
] as const
