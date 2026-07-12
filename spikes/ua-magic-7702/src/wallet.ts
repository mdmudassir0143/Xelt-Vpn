// Spike wallet layer: Magic (login + EOA + EIP-1193 provider) + Particle UA (7702).
// Goal: prove that a Magic-created EOA can (a) init a UniversalAccount in 7702 mode and
// (b) settle a USDC payment on the destination chain sourced cross-chain — no pre-funding
// of the destination chain required.

import { Magic } from "magic-sdk";
import { UniversalAccount, SUPPORTED_TOKEN_TYPE } from "@particle-network/universal-account-sdk";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  getAddress,
  parseUnits,
  serializeSignature,
  type Hex,
  type WalletClient,
} from "viem";

const ERC20_TRANSFER_ABI = [{
  name: "transfer", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ type: "bool" }],
}] as const;
const USDC_DECIMALS = CHAIN_ID_DECIMALS();
function CHAIN_ID_DECIMALS() { return Number(import.meta.env.VITE_CHAIN_ID) === 56 ? 18 : 6; }

const env = import.meta.env;
export const CHAIN_ID = Number(env.VITE_CHAIN_ID); // settlement chain (e.g. 42161 Arbitrum One)
const USDC = env.VITE_USDC_ADDRESS as `0x${string}`; // USDC on the settlement chain
const PAYTO = env.VITE_TEST_PAYTO as `0x${string}`; // test payee

export const magic = new Magic(env.VITE_MAGIC_PK, {
  network: { rpcUrl: env.VITE_CHAIN_RPC, chainId: CHAIN_ID },
});

let owner: `0x${string}` | null = null;
let ua: UniversalAccount | null = null;
let wc: WalletClient | null = null;

/** Magic email login → returns the created/derived EOA address. */
export async function login(email: string): Promise<`0x${string}`> {
  await magic.auth.loginWithEmailOTP({ email });

  // Robust address fetch via the EIP-1193 provider (eth_accounts) — this is the exact
  // address the provider signs with, and it avoids getInfo().publicAddress flakiness.
  const provider = magic.rpcProvider as any;
  let accounts: string[] = [];
  try {
    accounts = await provider.request({ method: "eth_accounts" });
  } catch { /* fall through to getInfo */ }
  let addr = accounts?.[0];
  if (!addr) {
    const info = await magic.user.getInfo();
    addr = info?.publicAddress ?? undefined;
  }
  if (!addr) throw new Error("no address from Magic — login may not have completed");
  owner = getAddress(addr);

  // viem wallet client over Magic's provider — used to sign the UA rootHash.
  wc = createWalletClient({ account: owner, transport: custom(provider) });
  return owner;
}

/** Log out the current Magic session so a different email can be used. */
export async function logout() {
  try { await magic.user.logout(); } catch { /* ignore */ }
  owner = null; ua = null; wc = null;
}

/** Init the UniversalAccount in EIP-7702 mode on the Magic EOA. */
export function initUA(): UniversalAccount {
  if (!owner) throw new Error("login first");
  ua = new UniversalAccount({
    projectId: env.VITE_PARTICLE_PROJECT_ID,
    projectClientKey: env.VITE_PARTICLE_CLIENT_KEY,
    projectAppUuid: env.VITE_PARTICLE_APP_ID,
    smartAccountOptions: { useEIP7702: true, ownerAddress: owner },
  });
  return ua;
}

/** Read the UA unified balance (aggregated across chains). */
export async function unifiedBalance() {
  if (!ua) throw new Error("initUA first");
  // Method name per SDK: getPrimaryAssets() → { assets, totalAmountInUSD } (confirm in spike).
  return await (ua as any).getPrimaryAssets();
}

/**
 * FREE preflight — builds the transfer (quote/simulation) without signing or sending.
 * Use it to find an amount that UA will actually route before spending a real fee.
 */
export async function quote(amount: string, onStep: (m: string) => void = () => {}) {
  if (!ua) throw new Error("initUA first");
  onStep(`quoting ${amount} USDC (free, no send)…`);
  const tx: any = await ua.createTransferTransaction({
    token: { chainId: CHAIN_ID, address: USDC },
    amount,
    receiver: PAYTO,
  });
  onStep(`✅ quote OK — ${tx.userOps?.length ?? 0} userOps; total deposit USD: ${tx.totalDepositTokenAmountInUSD ?? "?"}`);
  return tx;
}

/**
 * Settle `amount` USDC to PAYTO on the settlement chain, sourced cross-chain by UA.
 * THE SPIKE QUESTION: does Magic's provider produce the signature(s) UA needs — the
 * rootHash message sig, and (first tx per chain) the EIP-7702 authorization?
 */
// Shared: sign the rootHash (Magic personal_sign) + the first-per-chain EIP-7702
// authorizations (Magic sign7702Authorization), then send. Used by both tx builders.
async function signAndSend(tx: any, onStep: (m: string) => void) {
  onStep(`tx built (${tx.userOps?.length ?? 0} userOps); signing rootHash…`);
  const signature = await wc!.signMessage({ account: owner!, message: { raw: tx.rootHash as Hex } });

  const authorizations: { userOpHash: string; signature: string }[] = [];
  for (const op of tx.userOps ?? []) {
    if (op.eip7702Auth && !op.eip7702Delegated) {
      const sign7702 = (magic.wallet as any)?.sign7702Authorization;
      if (typeof sign7702 !== "function") throw new Error("magic.wallet.sign7702Authorization unavailable");
      onStep(`signing 7702 authorization (chain ${op.eip7702Auth.chainId}, nonce ${op.eip7702Auth.nonce})…`);
      const a = await sign7702.call(magic.wallet, {
        contractAddress: op.eip7702Auth.address, chainId: op.eip7702Auth.chainId, nonce: op.eip7702Auth.nonce,
      });
      authorizations.push({ userOpHash: op.userOpHash, signature: serializeSignature({ r: a.r as Hex, s: a.s as Hex, v: BigInt(a.v) }) });
    }
  }
  onStep(`sending transaction (${authorizations.length} authorization(s))…`);
  return await ua!.sendTransaction(tx, signature, authorizations);
}

/** OLD path — createTransferTransaction (deposits fee only, settlement never builds → refund). */
export async function payFor(amount: string, onStep: (m: string) => void = () => {}) {
  if (!ua || !owner || !wc) throw new Error("login + initUA first");
  onStep("creating TRANSFER transaction (createTransferTransaction)…");
  const tx = await ua.createTransferTransaction({ token: { chainId: CHAIN_ID, address: USDC }, amount, receiver: PAYTO });
  return await signAndSend(tx, onStep);
}

/** NEW path — createUniversalTransaction with expectTokens + raw USDC.transfer (the demo's pattern). */
function buildUniversalTransfer(amount: string) {
  return {
    chainId: CHAIN_ID,
    expectTokens: [{ type: SUPPORTED_TOKEN_TYPE.USDC, amount }],
    transactions: [{
      to: USDC,
      data: encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [PAYTO, parseUnits(amount, USDC_DECIMALS)] }),
    }],
  };
}

export async function quoteUniversal(amount: string, onStep: (m: string) => void = () => {}) {
  if (!ua) throw new Error("initUA first");
  onStep(`quoting UNIVERSAL ${amount} USDC (free, createUniversalTransaction)…`);
  const tx: any = await ua.createUniversalTransaction(buildUniversalTransfer(amount));
  onStep(`✅ universal quote OK — ${tx.userOps?.length ?? 0} userOps`);
  return tx;
}

export async function payForUniversal(amount: string, onStep: (m: string) => void = () => {}) {
  if (!ua || !owner || !wc) throw new Error("login + initUA first");
  onStep("creating UNIVERSAL transaction (createUniversalTransaction — demo pattern)…");
  const tx = await ua.createUniversalTransaction(buildUniversalTransfer(amount));
  return await signAndSend(tx, onStep);
}

export function explorerUrl(transactionId: string) {
  return `https://universalx.app/activity/details?id=${transactionId}`;
}
