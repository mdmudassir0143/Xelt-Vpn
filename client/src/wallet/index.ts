// Public interface for the Xelt wallet layer (Magic + Particle UA on Arbitrum).
// Consumers (App.tsx, the recharge/buy-time UI) use only these — chains, signing, and
// the UA/Magic SDKs stay behind this boundary.
//
// Typical flow:
//   const eoa = await login(email); initUA();
//   const bal = await getUnifiedBalance();
//   const fee = await quoteFeeUSD("10");            // show before confirm
//   const id  = await recharge("10", onStep);       // fund own Arbitrum balance
//   const ok  = await waitForSettlement(id);        // status 7 = delivered

export { login, logout, isLoggedIn, getOwner } from './magic';
export {
  initUA,
  getUnifiedBalance,
  quoteFeeUSD,
  recharge,
  payExternal,
  waitForSettlement,
  arbTxHashes,
  UA_STATUS,
  type UnifiedBalance,
} from './ua';
export { ARBITRUM, VPN_PAYEE } from './config';

/** Pure: USDC (human-readable string) for N minutes at a per-minute USD price. Clamped to
 * USDC's 6 decimals. Used to quote "buy N minutes" before an x402 payment. */
export function usdcForMinutes(minutes: number, pricePerMinuteUSD: number): string {
  const v = Math.round(minutes * pricePerMinuteUSD * 1e6) / 1e6;
  return String(v);
}
