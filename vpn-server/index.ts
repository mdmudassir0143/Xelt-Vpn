/**
 * Xelt — x402 Resource Server (Arbitrum / USDC)
 *
 * Two payment-gated endpoints:
 *   POST /connect — pay to start a VPN session
 *   POST /renew   — pay to extend a session (last 30s before expiry)
 *
 * Per-use payments are settled by the client via Particle Universal Accounts (USDC on
 * Arbitrum) — see client/src/wallet. The server issues an x402 402 challenge and verifies
 * the settlement by looking the UA transaction up (status 7 FINISHED, receiver === payTo,
 * amount >= price). The WireGuard half (boringtun) is unchanged and chain-agnostic.
 */

import { config } from 'dotenv';
import { Hono, type Context, type Next } from 'hono';
import { serve } from '@hono/node-server';

import {
  createConnectHandler,
  createRenewHandler,
  createClearSessionHandler,
  createPricingHandler,
  createSessionStatusHandler,
} from './handlers/vpn.js';
import { SessionStore } from './services/sessionStore.js';
import { loadPricingConfig, resolveDurationMinutes } from './services/pricing.js';
import { probeBoringtunHealth } from './services/boringtun.js';
import { startSessionExpiryWorker } from './services/sessionExpiry.js';
import { verifyUaPayment } from './services/paymentVerify.js';
import type { ParsedRequestBody } from './types/vpn.js';

config();

const CHAIN_ID = parseInt(process.env.ARB_CHAIN_ID || '42161', 10);
const NETWORK = `eip155:${CHAIN_ID}`;
const USDC = process.env.ARB_USDC_ADDRESS || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const PAYEE = process.env.PAYEE_ADDRESS || ''; // EVM address that receives USDC
const port = parseInt(process.env.PORT || '4021', 10);
const boringtunApi = process.env.BORINGTUN_API_URL || 'http://127.0.0.1:8080';

if (!/^0x[0-9a-fA-F]{40}$/.test(PAYEE)) {
  console.error('❌ Missing/invalid PAYEE_ADDRESS (0x + 40 hex). See .env.example.');
  process.exit(1);
}
if (!process.env.PARTICLE_PROJECT_ID || !process.env.PARTICLE_CLIENT_KEY || !process.env.PARTICLE_APP_ID) {
  console.error('❌ Missing PARTICLE_PROJECT_ID / PARTICLE_CLIENT_KEY / PARTICLE_APP_ID (needed to verify UA settlements).');
  process.exit(1);
}

const pricing = loadPricingConfig();
const sessionStore = new SessionStore();
const serverEnv = { sessionStore };
startSessionExpiryWorker(sessionStore);

console.log('\n' + '═'.repeat(60));
console.log('Xelt — x402 Resource Server (Arbitrum · USDC · Particle UA)');
console.log('═'.repeat(60));
console.log(`  Network:       ${NETWORK}`);
console.log(`  Payee:         ${PAYEE}`);
console.log(`  Asset:         USDC ${USDC}`);
console.log(`  Port:          ${port}`);
console.log(`  Price/min:     $${pricing.pricePerMinuteUsd} USDC`);
console.log(`  Boringtun API: ${boringtunApi}`);
console.log(`  Renew window:  last ${pricing.renewWindowSeconds}s before expiry`);
console.log('📋 Payment-gated: POST /connect, POST /renew\n');

const app = new Hono();

// CORS + cache the JSON body so the gate + handlers can read it.
app.use('*', async (c, next) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': '*',
    'Access-Control-Max-Age': '86400',
  };
  if (c.req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  Object.entries(corsHeaders).forEach(([k, v]) => c.header(k, v));

  if (c.req.method === 'POST') {
    try {
      const body = await c.req.raw.clone().json();
      c.set('parsedBody', body);
    } catch {
      c.set('parsedBody', undefined);
    }
  }
  await next();
});

app.use('*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path}`);
  await next();
  console.log(`  → ${c.res.status}`);
});

/**
 * x402 payment gate for /connect and /renew:
 *  - validate body + boringtun health + session precondition
 *  - no payment proof → 402 with the accepts block
 *  - proof present → verify the UA settlement, then run the handler
 */
function paymentGate(route: 'connect' | 'renew') {
  return async (c: Context, next: Next) => {
    const body = (c.get('parsedBody') || {}) as ParsedRequestBody;
    const wgKey = body.wireguardPublicKey?.trim();
    if (!wgKey) return c.json({ error: 'wireguardPublicKey is required in the JSON body' }, 400);

    let minutes: number;
    try {
      const fallback = route === 'renew' ? sessionStore.getSession(wgKey)?.durationMinutes : undefined;
      minutes = resolveDurationMinutes(body, pricing, fallback);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Invalid durationMinutes' }, 400);
    }

    if (route === 'renew' && !sessionStore.getSession(wgKey)) {
      return c.json({ error: 'No active session. Call POST /connect first.' }, 400);
    }
    if (route === 'connect' && sessionStore.getSession(wgKey)) {
      return c.json({ error: 'Session already active for this WireGuard key. Use POST /renew.' }, 409);
    }

    const amountUsd = Math.round(minutes * pricing.pricePerMinuteUsd * 1e6) / 1e6;
    const accepts = [{
      scheme: 'ua-arbitrum-usdc',
      network: NETWORK,
      chainId: CHAIN_ID,
      payTo: PAYEE,
      asset: USDC,
      amount: String(amountUsd),
      currency: 'USDC',
    }];

    // Payment proof may arrive in the body or an X-PAYMENT header (base64 JSON).
    let proof: {
      scheme?: string;
      transactionId?: string;
      payerAddress?: string;
      txHashes?: string[];
    } = {};
    const xPayment = c.req.header('x-payment');
    if (xPayment) {
      try { proof = JSON.parse(Buffer.from(xPayment, 'base64').toString('utf8')); } catch { /* ignore */ }
    }
    // Ensure the VPN backend (boringtun) is up AND is really boringtun BEFORE issuing a payment
    // challenge. If we only checked after payment, a down or misconfigured backend (e.g. another
    // service squatting boringtun's port) would let the user be charged with no tunnel to show.
    const bt = await probeBoringtunHealth();
    if (!bt.ok) return c.json({ error: bt.message ?? 'VPN backend unavailable' }, 503);

    const hasPayment = !!(proof.transactionId || body.transactionId);

    if (!hasPayment) {
      return c.json({
        error: 'payment_required',
        endpoint: `/${route}`,
        accepts,
        message: `Pay $${amountUsd} USDC to ${PAYEE} on Arbitrum for ${minutes} min, then retry with the payment in an X-PAYMENT header.`,
      }, 402);
    }

    // Verify the UA settlement by its on-chain USDC Transfer to the payee (txHashes) — robust
    // to Particle's indexing lag. transactionId is kept for reference/logging.
    const v = await verifyUaPayment({
      txHashes: proof.txHashes ?? [],
      transactionId: proof.transactionId || body.transactionId,
      payTo: PAYEE,
      minAmountUsd: amountUsd,
    });
    if (!v.ok) {
      console.log(`  ✗ payment invalid: ${v.reason}`);
      return c.json({ error: 'payment_invalid', reason: v.reason, accepts }, 402);
    }
    console.log(`  ✓ payment verified: $${v.amountUsd} USDC`);

    // Hand the verified payer to the connect/renew handler.
    const payerAddress = proof.payerAddress || body.payerAddress;
    c.set('parsedBody', { ...body, payerAddress });
    await next();
  };
}

// Payment-gated
app.post('/connect', paymentGate('connect'), createConnectHandler(serverEnv));
app.post('/renew', paymentGate('renew'), createRenewHandler(serverEnv));

// Free helpers
app.post('/session/clear', createClearSessionHandler(serverEnv));
app.get('/pricing', createPricingHandler());
app.get('/session/:wireguardPublicKey', createSessionStatusHandler(serverEnv));

app.get('/health', async (c) => {
  const boringtun = await probeBoringtunHealth();
  return c.json({ status: boringtun.ok ? 'ok' : 'degraded', service: 'xelt-x402', uptime: process.uptime(), boringtun });
});

app.get('/info', (c) =>
  c.json({
    service: 'xelt-x402',
    network: NETWORK,
    receiver: PAYEE,
    asset: { symbol: 'USDC', address: USDC, chainId: CHAIN_ID },
    settlement: 'Particle Universal Accounts (EIP-7702) on Arbitrum',
    endpoints: {
      paid: ['POST /connect', 'POST /renew'],
      free: ['GET /health', 'GET /info', 'GET /pricing', 'GET /session/:wireguardPublicKey', 'POST /session/clear'],
    },
    pricing: {
      pricePerMinuteUsd: pricing.pricePerMinuteUsd,
      defaultSessionMinutes: pricing.defaultSessionMinutes,
      renewWindowSeconds: pricing.renewWindowSeconds,
    },
  })
);

app.notFound((c) => c.json({ error: 'Not found', path: c.req.path, hint: 'Try GET /info' }, 404));

const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`\n✅ Xelt server running at http://localhost:${port}\n`);
  console.log('Quick test:');
  console.log(`  curl http://localhost:${port}/health`);
  console.log(`  curl "http://localhost:${port}/pricing?durationMinutes=5"`);
  console.log(`  curl -X POST http://localhost:${port}/connect -H 'content-type: application/json' -d '{"wireguardPublicKey":"x"}'  → 402\n`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${port} in use. Free it:  lsof -ti :${port} | xargs kill\n`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[${signal}] Shutting down...`);
  (server as unknown as { closeAllConnections?: () => void }).closeAllConnections?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

declare module 'hono' {
  interface ContextVariableMap {
    parsedBody: unknown;
  }
}
