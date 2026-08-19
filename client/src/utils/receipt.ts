// Opens the branded receipt page (xelt-receipt.html) in the system browser after a connect.
// The page is served same-origin as the app webview (localhost in dev/prod) so it works even
// while the tunnel is up, with an optional VITE_RECEIPT_BASE override for a deployed URL.

import { tauriInvokeSafe } from './tauriBridge';
import type { ConnectResult } from './vpnFlow';

function receiptBase(): string {
  const override = import.meta.env.VITE_RECEIPT_BASE as string | undefined;
  if (override) return override.replace(/\/$/, '');
  // Same origin as the webview (http://localhost:1420 in dev, :1421 in the packaged app).
  // If the app is served over a non-http origin (tauri://), fall back to the localhost plugin.
  return location.origin.startsWith('http') ? location.origin : 'http://localhost:1421';
}

/** Fire-and-forget: open the receipt for a completed connect. Never throws into the caller. */
export function openReceipt(reg: ConnectResult): void {
  try {
    const p = reg.payment;
    const params = new URLSearchParams({
      amount: p?.amountUsd != null ? String(p.amountUsd) : '',
      tx: p?.txHash ?? '',
      payer: p?.payer ?? '',
      payee: p?.payee ?? '',
      minutes: reg.durationMinutes != null ? String(reg.durationMinutes) : '',
      expires: reg.expiresAt ?? '',
      ip: reg.assigned_ip ?? '',
    });
    const url = `${receiptBase()}/xelt-receipt.html?${params.toString()}`;
    void tauriInvokeSafe('open_receipt', { url }).catch(() => {});
  } catch {
    /* receipt is best-effort; never disrupt the connect flow */
  }
}
