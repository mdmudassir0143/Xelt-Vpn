// Magic embedded wallet — the user's login and owner EOA. Email OTP login, an
// EIP-1193 provider (used to sign the UA rootHash), and the native EIP-7702
// authorization signer (magic.wallet.sign7702Authorization). Proven in the spike.

import { Magic } from 'magic-sdk';
import { createWalletClient, custom, getAddress, type WalletClient } from 'viem';
import { MAGIC_PUBLISHABLE_KEY, ARBITRUM } from './config';

export const magic = new Magic(MAGIC_PUBLISHABLE_KEY, {
  network: { rpcUrl: ARBITRUM.rpcUrl, chainId: ARBITRUM.chainId },
});

let owner: `0x${string}` | null = null;
let wc: WalletClient | null = null;

/** Email OTP login → returns the user's EOA. Robust: reads the address from the
 * provider (eth_accounts), falling back to user metadata. */
export async function login(email: string): Promise<`0x${string}`> {
  await magic.auth.loginWithEmailOTP({ email });
  const provider = magic.rpcProvider as any;
  let accounts: string[] = [];
  try { accounts = await provider.request({ method: 'eth_accounts' }); } catch { /* fall through */ }
  let addr = accounts?.[0];
  if (!addr) {
    const info: any = await magic.user.getInfo();
    addr = info?.publicAddress ?? undefined;
  }
  if (!addr) throw new Error('Magic returned no address — login may not have completed');
  owner = getAddress(addr);
  wc = createWalletClient({ account: owner, transport: custom(provider) });
  return owner;
}

export async function logout(): Promise<void> {
  try { await magic.user.logout(); } catch { /* ignore */ }
  owner = null;
  wc = null;
}

export async function isLoggedIn(): Promise<boolean> {
  try { return await magic.user.isLoggedIn(); } catch { return false; }
}

export function getOwner(): `0x${string}` {
  if (!owner) throw new Error('not logged in');
  return owner;
}

export function getWalletClient(): WalletClient {
  if (!wc) throw new Error('not logged in');
  return wc;
}
