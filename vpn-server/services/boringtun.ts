/**
 * Calls the Xelt boringtun HTTP API (http_api.rs) to add/remove WireGuard peers.
 */

import { resolveReachableLocalBase } from './localHost.js';

export interface BoringtunRegisterResponse {
  status: string;
  server_public_key: string;
  endpoint: string;
  assigned_ip: string;
}

let resolvedBoringtunBase: string | null = null;

function configuredBoringtunBase(): string {
  return (process.env.BORINGTUN_API_URL || 'http://localhost:8080').replace(/\/$/, '');
}

async function boringtunApiUrl(): Promise<string> {
  if (resolvedBoringtunBase) return resolvedBoringtunBase;

  const configured = configuredBoringtunBase();
  resolvedBoringtunBase = await resolveReachableLocalBase(configured, async (base) => {
    try {
      const res = await fetch(`${base}/health`);
      return res.status >= 200 && res.status < 600;
    } catch {
      return false;
    }
  });

  if (resolvedBoringtunBase !== configured) {
    console.log(
      `[local] loopback unreachable — boringtun API via ${resolvedBoringtunBase} (configured ${configured})`
    );
  }

  return resolvedBoringtunBase;
}

function formatBoringtunError(err: unknown, url: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error && 'cause' in err ? String((err as { cause?: unknown }).cause) : '';
  if (
    msg.includes('fetch failed') ||
    msg.includes('ECONNREFUSED') ||
    cause.includes('ECONNREFUSED')
  ) {
    return (
      `VPN backend (boringtun) is not running at ${url}. ` +
      'Start boringtun in a separate terminal before connecting.'
    );
  }
  return msg;
}

/** Quick probe — used before x402 payment so we do not charge when boringtun is down. */
export async function probeBoringtunHealth(timeoutMs = 2000): Promise<{
  ok: boolean;
  url: string;
  message: string;
}> {
  const url = await boringtunApiUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // boringtun exposes GET /health (no peer registration side-effects / log noise).
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    if (!res.ok) {
      return { ok: false, url, message: `boringtun returned ${res.status}` };
    }
    // A 200 is NOT enough: another service may be squatting this port (e.g. a Docker container)
    // and returning HTML. boringtun always responds application/json, so require that. Otherwise
    // this passes the pre-payment gate and the user gets charged for a tunnel that can't be made.
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('application/json')) {
      return {
        ok: false,
        url,
        message:
          `${url} answered but is not the boringtun API (content-type "${ctype || 'unknown'}"). ` +
          'Another service is likely using this port. Free it, or point BORINGTUN_API_URL at boringtun.',
      };
    }
    return { ok: true, url, message: 'boringtun reachable' };
  } catch (err) {
    return { ok: false, url, message: formatBoringtunError(err, url) };
  } finally {
    clearTimeout(timer);
  }
}

export async function registerWireGuardPeer(
  publicKeyBase64: string
): Promise<BoringtunRegisterResponse> {
  const base = await boringtunApiUrl();
  const url = `${base}/v1/register`;
  console.log(`[boringtun] POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: publicKeyBase64.trim() }),
  }).catch((err) => {
    throw new Error(formatBoringtunError(err, base));
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`boringtun register failed (${res.status}): ${text}`);
  }

  let data: BoringtunRegisterResponse;
  try {
    data = JSON.parse(text) as BoringtunRegisterResponse;
  } catch {
    const ctype = res.headers.get('content-type') || 'unknown';
    throw new Error(
      `boringtun register got a non-JSON response from ${url} (content-type "${ctype}"). ` +
      'Another service is likely using this port instead of boringtun.'
    );
  }
  if (!data.server_public_key || !data.assigned_ip || !data.endpoint) {
    throw new Error(`boringtun register incomplete response: ${text}`);
  }

  console.log(`[boringtun] peer registered ip=${data.assigned_ip} endpoint=${data.endpoint}`);
  return data;
}

export async function unregisterWireGuardPeer(publicKeyBase64: string): Promise<void> {
  const base = await boringtunApiUrl();
  const url = `${base}/v1/unregister`;
  console.log(`[boringtun] POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: publicKeyBase64.trim() }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`boringtun unregister failed (${res.status}): ${text}`);
  }

  console.log('[boringtun] peer unregistered');
}
