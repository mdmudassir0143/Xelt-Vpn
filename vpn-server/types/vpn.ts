export interface ConnectRequestBody {
  /** Client WireGuard public key (base64). Required. */
  wireguardPublicKey: string;
  /** How long the VPN session should last. Payment = duration × price-per-minute. */
  durationMinutes?: number;
  /** Payer's Arbitrum (EVM) address that paid. Shown in the app. */
  payerPublicKey?: string;
}

export interface RenewRequestBody {
  /** Must match an active session from /connect. */
  wireguardPublicKey: string;
  /** Optional: extend by a new duration. Defaults to the original session length. */
  durationMinutes?: number;
}

export interface VpnSession {
  wireguardPublicKey: string;
  durationMinutes: number;
  expiresAt: number;
  assignedIp: string;
  serverPublicKey: string;
  endpoint: string;
  createdAt: number;
  renewedCount: number;
  /** Payer's Arbitrum (EVM) address that paid for this session. */
  payerPublicKey?: string;
}

export interface VpnConnectResponse {
  sessionId: string;
  wireguardPublicKey: string;
  serverPublicKey: string;
  endpoint: string;
  assignedIp: string;
  durationMinutes: number;
  expiresAt: string;
  pricePaidDescription: string;
}

export interface VpnRenewResponse {
  wireguardPublicKey: string;
  durationMinutes: number;
  expiresAt: string;
  renewedCount: number;
  pricePaidDescription: string;
}

export interface PricingQuoteResponse {
  durationMinutes: number;
  price: string;
  pricePerMinuteUsd: number;
  totalAmountUsd: number;
  renewWindowSeconds: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
}

export interface ParsedRequestBody {
  wireguardPublicKey?: string;
  durationMinutes?: number;
  /** UA transactionId of the settled x402 payment (proof on the retry). */
  transactionId?: string;
  /** The payer's Magic EOA — owner of the UA settlement; shown in the app. */
  payerAddress?: string;
  /** @deprecated legacy payer-key field; superseded by payerAddress. */
  payerPublicKey?: string;
}
