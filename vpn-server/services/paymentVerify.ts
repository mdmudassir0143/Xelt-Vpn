/**
 * Verify a per-use x402 payment ON-CHAIN (Arbitrum RPC).
 *
 * The client settles USDC to the payee via Particle UA, waits for it to finish, extracts the
 * on-chain Arbitrum tx hash(es) of the settlement, and sends them. We confirm the receipt
 * shows a USDC Transfer to our payee of >= the price, and guard replay by tx hash.
 *
 * We deliberately DON'T use Particle's getTransaction here: it has minutes-long indexing lag
 * after the on-chain settlement is already final, which made verification flaky. The chain is
 * the source of truth and is available immediately.
 */

import { createPublicClient, http, getAddress, parseUnits } from 'viem';
import { arbitrum } from 'viem/chains';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const USDC = getAddress(process.env.ARB_USDC_ADDRESS || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const client = createPublicClient({ chain: arbitrum, transport: http(RPC) });
const spent = new Set<string>(); // on-chain tx hashes already credited (replay guard)

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  amountUsd?: number;
}

/** left-pad an address to a 32-byte topic (lowercase). */
const toTopic = (a: string) => '0x' + getAddress(a).slice(2).toLowerCase().padStart(64, '0');

export async function verifyUaPayment(opts: {
  txHashes?: string[];
  transactionId?: string;
  payTo: string;
  minAmountUsd: number;
}): Promise<VerifyResult> {
  const { txHashes = [], transactionId, payTo, minAmountUsd } = opts;
  console.log(`[verify] txId=${transactionId} hashes=${txHashes.length} minUsd=${minAmountUsd}`);

  if (txHashes.length === 0) return { ok: false, reason: 'no settlement tx hash provided' };

  const minUnits = parseUnits(String(minAmountUsd), 6);
  const payToTopic = toTopic(payTo);

  for (const h of txHashes) {
    if (spent.has(h)) return { ok: false, reason: 'replay: settlement already used' };
    let receipt;
    try {
      receipt = await client.getTransactionReceipt({ hash: h as `0x${string}` });
    } catch {
      continue; // not mined/visible yet, or malformed — try the next hash
    }
    if (receipt.status !== 'success') continue;

    for (const log of receipt.logs) {
      if (getAddress(log.address) !== USDC) continue;
      if (log.topics[0] !== TRANSFER_TOPIC) continue;
      if ((log.topics[2] ?? '').toLowerCase() !== payToTopic) continue; // to == payee
      const value = BigInt(log.data);
      if (value >= minUnits) {
        spent.add(h);
        const amountUsd = Number(value) / 1e6;
        console.log(`[verify] ✓ on-chain match: ${amountUsd} USDC to payee in ${h}`);
        return { ok: true, amountUsd };
      }
    }
  }
  return { ok: false, reason: 'no matching USDC transfer to payee in the provided settlement tx(s)' };
}
