// Wallet-layer config for the UXmaxx stack: Magic (login/EOA) + Particle Universal
// Accounts (EIP-7702) settling USDC on Arbitrum One. All values come from Vite env
// (VITE_-prefixed, per vite.config.ts envPrefix). See client/.env.example.
//
// Settlement is MAINNET-ONLY — the Particle UA SDK v2.0.3 CHAIN_ID enum has no testnet
// chains (spike-confirmed). We use Arbitrum One (42161) with real USDC.

const env = import.meta.env;

function required(name: string, value: string | undefined): string {
  if (!value) {
    // Fail loud in dev; the wallet cannot init without these.
    console.error(`[wallet] missing required env ${name}`);
  }
  return value ?? '';
}

export const PARTICLE = {
  projectId: required('VITE_PARTICLE_PROJECT_ID', env.VITE_PARTICLE_PROJECT_ID),
  clientKey: required('VITE_PARTICLE_CLIENT_KEY', env.VITE_PARTICLE_CLIENT_KEY),
  appId: required('VITE_PARTICLE_APP_ID', env.VITE_PARTICLE_APP_ID),
};

export const MAGIC_PUBLISHABLE_KEY = required('VITE_MAGIC_PK', env.VITE_MAGIC_PK);

// Arbitrum One settlement config.
export const ARBITRUM = {
  chainId: Number(env.VITE_ARB_CHAIN_ID ?? 42161),
  rpcUrl: env.VITE_ARBITRUM_RPC ?? 'https://arb1.arbitrum.io/rpc',
  usdc: (env.VITE_ARB_USDC_ADDRESS ?? '0xaf88d065e77c8cC2239327C5EDb3A432268e5831') as `0x${string}`,
  usdcDecimals: 6,
};

// Where per-use x402 payments are sent (the VPN service's Arbitrum address).
export const VPN_PAYEE = (env.VITE_VPN_PAYEE ?? '') as `0x${string}`;

// Minimal ERC-20 transfer ABI used to build USDC.transfer calls for UA.
export const ERC20_TRANSFER_ABI = [{
  name: 'transfer', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ type: 'bool' }],
}] as const;
