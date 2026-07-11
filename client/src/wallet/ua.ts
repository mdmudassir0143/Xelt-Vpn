// Particle Universal Account (EIP-7702) — the chain-abstraction engine.
//
// KEY LESSON (spike-verified): build value-moving txs with createUniversalTransaction
// (expectTokens + a raw USDC.transfer call), NOT createTransferTransaction — the latter
// deposits only the flat fee and refunds (status 11) in SDK 2.0.3.
//
// Signing: Magic personal_sign of tx.rootHash, plus Magic sign7702Authorization for the
// first-per-chain EIP-7702 authorization. Delivery is confirmed by polling
// getTransaction(id).status === 7 (FINISHED).

import { UniversalAccount, SUPPORTED_TOKEN_TYPE } from '@particle-network/universal-account-sdk';
import { encodeFunctionData, parseUnits, serializeSignature, formatUnits, type Hex } from 'viem';
import { PARTICLE, ARBITRUM, ERC20_TRANSFER_ABI } from './config';
import { magic, getOwner, getWalletClient } from './magic';

// UA_TRANSACTION_STATUS: 7 = FINISHED (delivered), 11 = REFUND_FINISHED, 6/14 = failed.
export const UA_STATUS = { FINISHED: 7, REFUND_FINISHED: 11, EXEC_FAILED: 6, PENNY_FAILED: 14 } as const;

let ua: UniversalAccount | null = null;

export function initUA(): UniversalAccount {
  ua = new UniversalAccount({
    projectId: PARTICLE.projectId,
    projectClientKey: PARTICLE.clientKey,
    projectAppUuid: PARTICLE.appId,
    // name/version are typed required but the SDK defaults them at runtime (spike + demo
    // pass only these two) — cast to match the proven runtime shape.
    smartAccountOptions: { useEIP7702: true, ownerAddress: getOwner() } as any,
  });
  return ua;
}

function requireUA(): UniversalAccount {
  if (!ua) throw new Error('UA not initialized — call initUA() after login');
  return ua;
}

export interface UnifiedBalance {
  usd: number;
  /** USDC held on Arbitrum specifically (what per-use x402 can spend cheaply). */
  arbitrumUsdc: number;
}

export async function getUnifiedBalance(): Promise<UnifiedBalance> {
  const assets: any = await requireUA().getPrimaryAssets();
  const usd = Number(assets?.totalAmountInUSD ?? 0);
  let arbitrumUsdc = 0;
  for (const a of assets?.assets ?? []) {
    if (String(a.tokenType).toLowerCase() !== 'usdc') continue;
    for (const agg of a.chainAggregation ?? []) {
      if (Number(agg.token?.chainId) === ARBITRUM.chainId) arbitrumUsdc += Number(agg.amount ?? 0);
    }
  }
  return { usd, arbitrumUsdc };
}

/** createUniversalTransaction payload: ensure `amount` USDC on Arbitrum, then transfer it
 * to `receiver` (self for a recharge, the VPN payee for a direct cross-chain payment). */
function buildTransfer(amount: string, receiver: `0x${string}`) {
  return {
    chainId: ARBITRUM.chainId,
    expectTokens: [{ type: SUPPORTED_TOKEN_TYPE.USDC, amount }],
    transactions: [{
      to: ARBITRUM.usdc,
      data: encodeFunctionData({
        abi: ERC20_TRANSFER_ABI, functionName: 'transfer',
        args: [receiver, parseUnits(amount, ARBITRUM.usdcDecimals)],
      }),
    }],
  };
}

/** Total UA settlement fee in USD for moving `amount` USDC to Arbitrum (free — quote only). */
export async function quoteFeeUSD(amount: string): Promise<number> {
  const tx: any = await requireUA().createUniversalTransaction(buildTransfer(amount, getOwner()));
  const totals = tx?.feeQuotes?.[0]?.fees?.totals;
  const hex = totals?.feeTokenAmountInUSD ?? totals?.gasFeeTokenAmountInUSD;
  return hex ? Number(formatUnits(BigInt(hex), 18)) : 0;
}

/** Sign (Magic) + send a built UA transaction. Returns the Particle transactionId. */
async function signAndSend(tx: any, onStep: (m: string) => void): Promise<string> {
  const owner = getOwner();
  onStep(`signing (${tx.userOps?.length ?? 0} userOps)…`);
  const signature = await getWalletClient().signMessage({ account: owner, message: { raw: tx.rootHash as Hex } });

  const authorizations: { userOpHash: string; signature: string }[] = [];
  for (const op of tx.userOps ?? []) {
    if (op.eip7702Auth && !op.eip7702Delegated) {
      const sign7702 = (magic.wallet as any)?.sign7702Authorization;
      if (typeof sign7702 !== 'function') throw new Error('magic.wallet.sign7702Authorization unavailable');
      const a = await sign7702.call(magic.wallet, {
        contractAddress: op.eip7702Auth.address, chainId: op.eip7702Auth.chainId, nonce: op.eip7702Auth.nonce,
      });
      authorizations.push({ userOpHash: op.userOpHash, signature: serializeSignature({ r: a.r as Hex, s: a.s as Hex, v: BigInt(a.v) }) });
    }
  }
  onStep('submitting…');
  const res: any = await requireUA().sendTransaction(tx, signature, authorizations);
  return res.transactionId as string;
}

/** Recharge: pull USDC from any EVM chain into the user's OWN Arbitrum balance. */
export async function recharge(amountUSD: string, onStep: (m: string) => void = () => {}): Promise<string> {
  onStep(`recharging $${amountUSD} to your Arbitrum balance…`);
  const tx = await requireUA().createUniversalTransaction(buildTransfer(amountUSD, getOwner()));
  return signAndSend(tx, onStep);
}

/** Direct cross-chain pay: send `amount` USDC to an external payee on Arbitrum. */
export async function payExternal(amount: string, payee: `0x${string}`, onStep: (m: string) => void = () => {}): Promise<string> {
  onStep(`paying $${amount} to ${payee.slice(0, 6)}…`);
  const tx = await requireUA().createUniversalTransaction(buildTransfer(amount, payee));
  return signAndSend(tx, onStep);
}

/** Poll until the UA transaction reaches a terminal status. Returns the tx on FINISHED (7). */
export async function waitForSettlement(
  transactionId: string,
  timeoutMs = 180_000,
): Promise<{ ok: boolean; status: number; tx?: any }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let status = -1;
    let tx: any = null;
    try {
      tx = await requireUA().getTransaction(transactionId);
      status = tx.status;
    } catch {
      /* not indexed yet — retry */
    }
    if (status === UA_STATUS.FINISHED) return { ok: true, status, tx };
    if ([UA_STATUS.REFUND_FINISHED, UA_STATUS.EXEC_FAILED, UA_STATUS.PENNY_FAILED].includes(status as any)) {
      return { ok: false, status, tx };
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  return { ok: false, status: -1 };
}

/** On-chain Arbitrum tx hashes of a settled UA transaction — the server verifies these
 * directly on Arbitrum (Particle's getTransaction has minutes-long indexing lag). */
export function arbTxHashes(tx: any): string[] {
  const hashes = new Set<string>();
  // Scan every array-valued field (deposit/lending/settlement/refund userOps, etc.) for an
  // Arbitrum op with an on-chain txHash — robust to same-chain vs cross-chain shapes.
  for (const val of Object.values(tx ?? {})) {
    if (!Array.isArray(val)) continue;
    for (const o of val) {
      if (o && typeof o === 'object' && Number((o as any).chainId) === ARBITRUM.chainId && typeof (o as any).txHash === 'string' && (o as any).txHash) {
        hashes.add((o as any).txHash);
      }
    }
  }
  return [...hashes];
}
