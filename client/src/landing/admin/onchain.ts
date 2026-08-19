// Live on-chain analytics for the admin dashboard. Every Xelt session is a USDC payment to the
// treasury on Arbitrum, so we read those Transfer logs straight from the RPC (no backend).

import { createPublicClient, http, fallback, parseAbiItem, getAddress, formatUnits } from 'viem';
import { arbitrum } from 'viem/chains';

const TREASURY = getAddress('0x3d2b05eE2457B174DE4dC53e714db52B1F8B4573');
const USDC = getAddress('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const PRICE_PER_MIN = 0.02;

export interface Txn {
  hash: string;
  from: string;
  amountUsd: number;
  ts: number; // unix seconds, 0 if not fetched
  block: bigint;
}

export interface OnchainStats {
  revenueUsd: number;
  sessions: number;
  uniqueUsers: number;
  minutesSold: number;
  avgUsd: number;
  txns: Txn[];
}

const client = createPublicClient({
  chain: arbitrum,
  transport: fallback([http('https://arb1.arbitrum.io/rpc'), http('https://arbitrum.llamarpc.com')]),
});

/** Read every USDC payment into the treasury and roll it up. onProgress: 0..1. */
export async function fetchTreasuryStats(onProgress?: (p: number) => void): Promise<OnchainStats> {
  const latest = await client.getBlockNumber();
  const start = latest - 20_000_000n; // ~8 weeks back, covers all payments
  const WIN = 450_000n;

  const ranges: [bigint, bigint][] = [];
  for (let to = latest; to > start; to -= WIN) {
    const from = to - WIN + 1n > start ? to - WIN + 1n : start;
    ranges.push([from, to]);
  }

  const logs: { hash: string; logIndex: number; from: string; value: bigint; block: bigint }[] = [];
  const CONC = 6;
  for (let i = 0; i < ranges.length; i += CONC) {
    const batch = ranges.slice(i, i + CONC);
    const results = await Promise.all(
      batch.map(([from, to]) =>
        client
          .getLogs({ address: USDC, event: TRANSFER, args: { to: TREASURY }, fromBlock: from, toBlock: to })
          .catch(() => [] as any[])
      )
    );
    for (const r of results) {
      for (const l of r) {
        logs.push({
          hash: l.transactionHash!,
          logIndex: l.logIndex!,
          from: l.args.from as string,
          value: l.args.value as bigint,
          block: l.blockNumber!,
        });
      }
    }
    onProgress?.(Math.min(1, (i + CONC) / ranges.length));
  }

  // Dedupe + roll up.
  const seen = new Set<string>();
  const txns: Txn[] = [];
  const users = new Set<string>();
  let revenue = 0;
  for (const l of logs) {
    const key = `${l.hash}:${l.logIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const amt = Number(formatUnits(l.value, 6));
    revenue += amt;
    users.add(l.from.toLowerCase());
    txns.push({ hash: l.hash, from: l.from, amountUsd: amt, ts: 0, block: l.block });
  }
  txns.sort((a, b) => Number(b.block - a.block));

  // Timestamps for the recent rows only (the table).
  await Promise.all(
    txns.slice(0, 12).map(async (t) => {
      try {
        const b = await client.getBlock({ blockNumber: t.block });
        t.ts = Number(b.timestamp);
      } catch { /* leave 0 */ }
    })
  );

  return {
    revenueUsd: revenue,
    sessions: txns.length,
    uniqueUsers: users.size,
    minutesSold: Math.round(revenue / PRICE_PER_MIN),
    avgUsd: txns.length ? revenue / txns.length : 0,
    txns,
  };
}
