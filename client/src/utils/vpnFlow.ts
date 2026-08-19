// Per-use VPN payment flow: x402 over a Particle UA settlement (USDC on Arbitrum).
//
// x402 over a UA settlement: POST /connect → 402 { accepts } → settle USDC to the payee on
// Arbitrum via the wallet module (payExternal) → poll to FINISHED → retry /connect with the
// X-PAYMENT proof → server returns the WireGuard params, which App.tsx hands to the Rust
// tunnel layer. This module is Tauri-agnostic on purpose (pure fetch + wallet).

import {
  getOwner,
  payExternal,
  waitForSettlement,
  arbTxHashes,
} from '../wallet';

const API_BASE =
  import.meta.env.VITE_X402_API_URL ||
  `http://${import.meta.env.VITE_SERVER_IP || '127.0.0.1'}:4021`;

/** WireGuard params the server returns after a verified payment; App.tsx passes these to Rust. */
export interface ConnectResult {
  sessionId?: string;
  server_public_key: string;
  endpoint: string;
  assigned_ip: string;
  wireguardPublicKey: string;
  durationMinutes: number;
  expiresAt: string;
  pricePaidDescription?: string;
  /** Payment details for the receipt, attached client-side after settlement. */
  payment?: {
    amountUsd: number;
    txHash?: string;
    payer: string;
    payee: string;
  };
}

export interface SessionStatus {
  active: boolean;
  wireguardPublicKey: string;
  assignedIp?: string;
  serverPublicKey?: string;
  endpoint?: string;
  durationMinutes?: number;
  expiresAt?: string;
  secondsRemaining?: number;
  canRenew?: boolean;
  renewWindowSeconds?: number;
  renewedCount?: number;
  payerAddress?: string;
}

interface Accepts {
  scheme: string;
  network: string;
  chainId: number;
  payTo: `0x${string}`;
  asset: string;
  amount: string;
  currency: string;
}

export type StepFn = (msg: string) => void;

async function payAndRetry(
  route: 'connect' | 'renew',
  wireguardPublicKey: string,
  minutes: number,
  onStep: StepFn = () => {},
): Promise<ConnectResult> {
  const body = JSON.stringify({ wireguardPublicKey, durationMinutes: minutes });

  // 1. x402 challenge
  onStep('requesting price…');
  const challenge = await fetch(`${API_BASE}/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  if (challenge.status !== 402) {
    if (challenge.ok) return (await challenge.json()) as ConnectResult;
    const err = await challenge.json().catch(() => ({}));
    throw new Error(err.error || `${route} failed: HTTP ${challenge.status}`);
  }
  const { accepts } = (await challenge.json()) as { accepts: Accepts[] };
  const a = accepts?.[0];
  if (!a) throw new Error('server did not return a payment method');

  // 2. Settle the USDC payment via Particle Universal Accounts — gasless for the user and
  // cross-chain capable (pays from the unified balance, settles on Arbitrum). We verify the
  // resulting on-chain USDC Transfer server-side (txHashes), robust to Particle's indexing lag.
  onStep(`paying $${a.amount} USDC…`);
  const transactionId = await payExternal(a.amount, a.payTo, onStep);
  onStep('confirming settlement on Arbitrum…');
  const settled = await waitForSettlement(transactionId);
  if (!settled.ok) {
    throw new Error(`payment not confirmed (status ${settled.status}) — funds were refunded`);
  }
  const txHashes = arbTxHashes(settled.tx);
  const xPayment = btoa(JSON.stringify({ scheme: 'ua', transactionId, payerAddress: getOwner(), txHashes }));

  // 3. retry with the x402 payment proof → server verifies + returns WireGuard params
  onStep('unlocking tunnel…');
  const paid = await fetch(`${API_BASE}/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-payment': xPayment },
    body,
  });
  if (!paid.ok) {
    const err = await paid.json().catch(() => ({}));
    throw new Error(err.reason || err.error || `${route} verification failed: HTTP ${paid.status}`);
  }
  const result = (await paid.json()) as ConnectResult;
  result.payment = {
    amountUsd: Number(a.amount),
    txHash: txHashes[0],
    payer: getOwner(),
    payee: a.payTo,
  };
  return result;
}

/** Pay for and start a new VPN session. Returns the WireGuard params for the Rust tunnel. */
export const vpnConnect = (wgPublicKey: string, minutes: number, onStep?: StepFn) =>
  payAndRetry('connect', wgPublicKey, minutes, onStep);

/** Pay to extend the active session. */
export const vpnRenew = (wgPublicKey: string, minutes: number, onStep?: StepFn) =>
  payAndRetry('renew', wgPublicKey, minutes, onStep);

export async function fetchSessionStatus(wgPublicKey: string): Promise<SessionStatus> {
  const res = await fetch(`${API_BASE}/session/${encodeURIComponent(wgPublicKey)}`);
  if (!res.ok) return { active: false, wireguardPublicKey: wgPublicKey };
  return (await res.json()) as SessionStatus;
}

/** Drop the server-side session + WireGuard peer (free) so a fresh session can be bought. */
export async function clearSession(wgPublicKey: string): Promise<void> {
  await fetch(`${API_BASE}/session/clear`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wireguardPublicKey: wgPublicKey }),
  }).catch(() => {});
}

export interface PricingQuote {
  durationMinutes: number;
  totalAmountUsd: number;
  pricePerMinuteUsd: number;
  price: string;
  renewWindowSeconds: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
}

export async function fetchPricing(minutes?: number): Promise<PricingQuote> {
  const q = minutes ? `?durationMinutes=${minutes}` : '';
  const res = await fetch(`${API_BASE}/pricing${q}`);
  if (!res.ok) throw new Error(`pricing failed: HTTP ${res.status}`);
  return (await res.json()) as PricingQuote;
}

export { API_BASE };
