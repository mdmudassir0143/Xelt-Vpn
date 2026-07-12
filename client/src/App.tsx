import { useState, useEffect, useCallback, useRef, type CSSProperties, type ReactNode } from "react";
import { tauriInvokeSafe, tauriListenSafe, probeTauriIpc } from "./utils/tauriBridge";
import {
  login,
  logout,
  getOwner,
  initUA,
  getUnifiedBalance,
  recharge,
  waitForSettlement,
  usdcForMinutes,
  type UnifiedBalance,
} from "./wallet";
import {
  vpnConnect,
  vpnRenew,
  fetchSessionStatus,
  clearSession,
  type SessionStatus,
  type ConnectResult,
} from "./utils/vpnFlow";

// ── Tauri tunnel contract (reused as-is; connect_paid is payment-agnostic) ──
type VpnStatus = "disconnected" | "connecting" | "connected" | "disconnecting" | "error";
interface ConnectedInfo {
  assigned_ip: string;
  wallet_address?: string;
  gateway_balance?: string;
}
interface VpnStateEvent {
  status: VpnStatus;
  assigned_ip?: string;
  error?: string;
}

const SESSION_MINUTES = Number(import.meta.env.VITE_SESSION_MINUTES || 5);
const SERVER_IP = (import.meta.env.VITE_SERVER_IP as string) || "127.0.0.1";
const PRICE_PER_MIN = 0.02; // display estimate; server is source of truth

const short = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export default function App() {
  const [tauriReady, setTauriReady] = useState<boolean | null>(null);
  const [eoa, setEoa] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [balance, setBalance] = useState<UnifiedBalance | null>(null);
  const [status, setStatus] = useState<VpnStatus>("disconnected");
  const [assignedIp, setAssignedIp] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionStatus | null>(null);
  const [minutes, setMinutes] = useState(SESSION_MINUTES);
  const [rechargeUsd, setRechargeUsd] = useState("5");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [balBusy, setBalBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tunnelStartedRef = useRef(false);
  const expiredRef = useRef(false);

  const expiresMs = sessionInfo?.expiresAt ? Date.parse(sessionInfo.expiresAt) : null;
  const secondsLeft =
    expiresMs != null && !Number.isNaN(expiresMs) ? Math.max(0, Math.floor((expiresMs - nowMs) / 1000)) : null;

  // Tauri readiness
  useEffect(() => {
    let off = false;
    probeTauriIpc().then((ok) => !off && setTauriReady(ok));
    return () => {
      off = true;
    };
  }, []);

  // 1s tick for the countdown
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshBalance = useCallback(async () => {
    setBalBusy(true);
    try {
      setBalance(await getUnifiedBalance());
    } catch {
      /* keep last-known */
    } finally {
      setBalBusy(false);
    }
  }, []);

  const copyAddr = async () => {
    if (!eoa) return;
    try {
      await navigator.clipboard.writeText(eoa);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const refreshSession = useCallback(async () => {
    if (tauriReady !== true) return;
    try {
      const wg = await tauriInvokeSafe<string>("get_pubkey");
      const info = await fetchSessionStatus(wg);
      setSessionInfo(info.active ? info : null);
    } catch {
      /* leave as-is */
    }
  }, [tauriReady]);

  // Poll session status
  useEffect(() => {
    if (tauriReady !== true || !eoa) return;
    void refreshSession();
    const id = setInterval(refreshSession, sessionInfo?.active ? 5000 : 20000);
    return () => clearInterval(id);
  }, [tauriReady, eoa, sessionInfo?.active, refreshSession]);

  // Tunnel status + events
  useEffect(() => {
    if (tauriReady !== true) return;
    tauriInvokeSafe<VpnStatus>("get_status").then(setStatus).catch(() => {});
    const unsubs: Array<() => void> = [];
    tauriListenSafe<VpnStateEvent>("vpn-state", (p) => {
      setStatus(p.status);
      if (p.assigned_ip) setAssignedIp(p.assigned_ip);
      if (p.status === "error" && p.error) setError(p.error);
      if (p.status === "disconnected" || p.status === "error") {
        setAssignedIp(null);
        tunnelStartedRef.current = false;
      }
    }).then((u) => unsubs.push(u));
    return () => unsubs.forEach((f) => f());
  }, [tauriReady]);

  // ── actions ──
  const doLogin = async () => {
    setError(null);
    setBusy("signing in…");
    try {
      const addr = await login(email.trim());
      setEoa(addr);
      initUA();
      await refreshBalance();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const doLogout = async () => {
    await logout();
    setEoa(null);
    setBalance(null);
    setNotice(null);
  };

  const doRecharge = async () => {
    setError(null);
    try {
      setBusy("recharging…");
      const id = await recharge(rechargeUsd, (m) => setBusy(m));
      setBusy("confirming on Arbitrum…");
      const settled = await waitForSettlement(id);
      if (!settled.ok) throw new Error(`recharge refunded (status ${settled.status})`);
      setNotice(`Added $${rechargeUsd} to your Arbitrum balance.`);
      await refreshBalance();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const startTunnel = useCallback(async (reg: ConnectResult) => {
    setStatus("connecting");
    const info = await tauriInvokeSafe<ConnectedInfo>("connect_paid", {
      registration: {
        server_public_key: reg.server_public_key,
        endpoint: reg.endpoint,
        assigned_ip: reg.assigned_ip.includes("/") ? reg.assigned_ip : `${reg.assigned_ip}/32`,
        expires_at: reg.expiresAt,
      },
      serverIp: SERVER_IP,
      walletAddress: getOwner(),
    });
    setAssignedIp(info.assigned_ip);
    setStatus("connected");
  }, []);

  const doConnect = async () => {
    setError(null);
    tunnelStartedRef.current = true;
    try {
      const wg = await tauriInvokeSafe<string>("get_pubkey");
      setBusy("starting payment…");
      const reg = await vpnConnect(wg, minutes, (m) => setBusy(m));
      setBusy("bringing up tunnel…");
      await startTunnel(reg);
      setNotice(`Connected — ${minutes} min.`);
      void refreshSession();
      void refreshBalance();
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStatus("disconnected");
      tunnelStartedRef.current = false;
    } finally {
      setBusy(null);
    }
  };

  const doRenew = async () => {
    setError(null);
    try {
      const wg = await tauriInvokeSafe<string>("get_pubkey");
      setBusy("renewing…");
      await vpnRenew(wg, minutes, (m) => setBusy(m));
      setNotice(`Renewed — ${minutes} min added.`);
      void refreshSession();
      void refreshBalance();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const doDisconnect = async () => {
    setStatus("disconnecting");
    try {
      await tauriInvokeSafe("disconnect");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
    setStatus("disconnected");
    setAssignedIp(null);
    tunnelStartedRef.current = false;
  };

  // Auto-disconnect when the paid session runs out.
  useEffect(() => {
    if (secondsLeft != null && secondsLeft > 0) {
      expiredRef.current = false; // fresh/renewed session — arm for the next expiry
    } else if (secondsLeft === 0 && status === "connected" && !expiredRef.current) {
      expiredRef.current = true;
      setNotice("Session ended — disconnected.");
      setSessionInfo(null);
      void doDisconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, status]);

  // Reconnect the tunnel from an existing paid session (no new payment).
  const doReconnect = async () => {
    if (!sessionInfo?.serverPublicKey || !sessionInfo.endpoint || !sessionInfo.assignedIp || !sessionInfo.expiresAt) {
      setError("Session data unavailable — buy a new session.");
      return;
    }
    setError(null);
    setBusy("reconnecting…");
    try {
      await startTunnel({
        server_public_key: sessionInfo.serverPublicKey,
        endpoint: sessionInfo.endpoint,
        assigned_ip: sessionInfo.assignedIp,
        wireguardPublicKey: sessionInfo.wireguardPublicKey,
        durationMinutes: sessionInfo.durationMinutes ?? minutes,
        expiresAt: sessionInfo.expiresAt,
      });
      setNotice("Reconnected.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  // Drop the active paid session so a fresh one can be bought.
  const doClearSession = async () => {
    try {
      const wg = await tauriInvokeSafe<string>("get_pubkey");
      await clearSession(wg);
    } catch {
      /* ignore */
    }
    setSessionInfo(null);
    setNotice("Session ended.");
  };

  // ── UI ──
  const estUsd = usdcForMinutes(minutes, PRICE_PER_MIN);

  if (!eoa) {
    return (
      <Shell>
        <h1 style={S.h1}>Xelt</h1>
        <p style={S.sub}>Pay-per-minute VPN. Log in with email — no seed phrase, no chains.</p>
        <div style={S.card}>
          <input style={S.input} placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button style={S.primary} disabled={!!busy || !email.trim()} onClick={doLogin}>
            {busy ?? "Continue with email"}
          </button>
        </div>
        {error && <p style={S.err}>{error}</p>}
        {tauriReady === false && <p style={S.warn}>Not running in the Xelt app — launch with `npm run tauri dev`.</p>}
      </Shell>
    );
  }

  const connected = status === "connected";
  const hasActiveSession = !connected && sessionInfo?.active === true && (secondsLeft == null || secondsLeft > 0);
  const msg = error ?? notice;
  return (
    <Shell>
      <div style={S.walletBar}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.walletRow}>
            <span style={S.mono}>{short(eoa)}</span>
            <button style={S.iconBtn} title="Copy address" onClick={copyAddr}>
              {copied ? "✓ copied" : "⧉ copy"}
            </button>
          </div>
          <div style={S.balance}>
            ${balance ? balance.arbitrumUsdc.toFixed(2) : "—"} <span style={S.balUnit}>USDC · Arbitrum</span>
          </div>
          <div style={S.balSub}>
            <span>${balance ? balance.usd.toFixed(2) : "—"} total across all chains</span>
            <button style={S.iconBtn} title="Refresh balance" onClick={() => void refreshBalance()}>
              {balBusy ? "…" : "↻"}
            </button>
          </div>
        </div>
        <button style={S.ghost} onClick={doLogout}>
          Log out
        </button>
      </div>

      {msg && <div style={error ? S.errBox : S.okBox}>{msg}</div>}

      {/* Recharge */}
      <div style={S.card}>
        <div style={S.cardTitle}>Recharge (any chain → Arbitrum)</div>
        <div style={S.row}>
          <span style={S.muted}>$</span>
          <input style={{ ...S.input, width: 90 }} value={rechargeUsd} onChange={(e) => setRechargeUsd(e.target.value)} />
          <button style={S.secondary} disabled={!!busy} onClick={doRecharge}>
            Add funds
          </button>
        </div>
        <div style={S.fee}>≈ $0.17 flat cross-chain fee (any chain → Arbitrum)</div>
      </div>

      {connected ? (
        <>
          {/* Activity — branded connection status */}
          <div style={S.card}>
            <div style={S.cardTitle}>Activity</div>
            <div style={S.statusRow}>
              <span style={S.liveDot} />
              <span style={S.connectedText}>Connected</span>
              <span style={S.muted}>· {sessionInfo?.durationMinutes ?? minutes}m session</span>
            </div>
            <div style={S.timer}>{secondsLeft != null ? fmt(secondsLeft) : "—"}</div>
            <div style={S.ipRow}>
              your IP <span style={S.ipChip}>{assignedIp ?? "—"}</span>
            </div>
          </div>

          {/* Renew — mirrors Buy VPN time */}
          <div style={S.card}>
            <div style={S.cardTitle}>Renew session</div>
            <MinutePicker minutes={minutes} setMinutes={setMinutes} />
            <div style={S.fee}>≈ ${estUsd} USDC{balance && balance.arbitrumUsdc > 0 ? " (from Arbitrum balance)" : ""}</div>
            <button style={S.primary} disabled={!!busy} onClick={doRenew}>
              {busy ?? `Renew +${minutes}m · $${estUsd}`}
            </button>
          </div>

          <button style={S.danger} disabled={!!busy} onClick={doDisconnect}>
            Disconnect
          </button>
        </>
      ) : hasActiveSession ? (
        /* Paid session, tunnel down — resume without paying again */
        <div style={S.card}>
          <div style={S.cardTitle}>Active session</div>
          <div style={S.statusRow}>
            <span style={{ ...S.liveDot, background: "#ff7a00", boxShadow: "0 0 0 4px rgba(255,122,0,0.18)" }} />
            <span style={{ ...S.connectedText, color: "#ff7a00" }}>Paused</span>
            <span style={S.muted}>· paid, not connected</span>
          </div>
          <div style={S.timer}>{secondsLeft != null ? fmt(secondsLeft) : "—"}</div>
          <button style={S.primary} disabled={!!busy} onClick={doReconnect}>
            {busy ?? "Reconnect (no charge)"}
          </button>
          <button style={S.ghost} disabled={!!busy} onClick={doClearSession}>
            End session
          </button>
        </div>
      ) : (
        /* Buy VPN time */
        <div style={S.card}>
          <div style={S.cardTitle}>Buy VPN time</div>
          <MinutePicker minutes={minutes} setMinutes={setMinutes} />
          <div style={S.fee}>≈ ${estUsd} USDC {balance && balance.arbitrumUsdc > 0 ? "(from Arbitrum balance)" : "(sourced cross-chain)"}</div>
          <button style={S.primary} disabled={!!busy} onClick={doConnect}>
            {busy ?? `Connect · $${estUsd}`}
          </button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={S.shell}>
      <div style={S.container}>{children}</div>
    </div>
  );
}

function MinutePicker({ minutes, setMinutes }: { minutes: number; setMinutes: (m: number) => void }) {
  return (
    <div style={S.row}>
      {[5, 30, 60].map((m) => (
        <button key={m} style={m === minutes ? S.chipOn : S.chip} onClick={() => setMinutes(m)}>
          {m}m
        </button>
      ))}
      <input
        type="number"
        min={1}
        max={600}
        value={minutes}
        onChange={(e) => setMinutes(Math.max(1, Math.min(600, Math.floor(Number(e.target.value) || 1))))}
        style={{ ...S.input, width: 74, flex: "none" }}
        aria-label="custom minutes"
      />
      <span style={S.muted}>min</span>
    </div>
  );
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const INK = "#0a0a0a";
const S: Record<string, CSSProperties> = {
  shell: { height: "100%", overflowY: "auto", overflowX: "hidden", background: "#fafaf8", color: INK, fontFamily: "'Inter', ui-sans-serif, system-ui" },
  container: { maxWidth: 440, margin: "0 auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  h1: { fontSize: 46, fontWeight: 900, margin: "18px 0 2px", letterSpacing: -2 },
  sub: { color: "#3a3a38", margin: "0 0 6px", fontSize: 14, fontWeight: 500 },
  card: { background: "#fff", border: `2px solid ${INK}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: `4px 4px 0 ${INK}` },
  cardTitle: { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: "#8a8a85" },
  walletBar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffe600", border: `2px solid ${INK}`, borderRadius: 14, padding: "12px 14px", boxShadow: `4px 4px 0 ${INK}` },
  mono: { fontFamily: "ui-monospace, monospace", fontSize: 13, fontWeight: 800 },
  walletRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 3 },
  iconBtn: { background: "rgba(0,0,0,0.06)", border: `1.5px solid ${INK}`, borderRadius: 7, padding: "1px 7px", fontSize: 11, fontWeight: 800, cursor: "pointer", lineHeight: 1.5, whiteSpace: "nowrap" },
  balance: { fontSize: 26, fontWeight: 900, lineHeight: 1.1 },
  balUnit: { fontSize: 12, fontWeight: 800, color: "#3a3a38" },
  balSub: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: "#3a3a38", marginTop: 3 },
  muted: { color: "#8a8a85", fontWeight: 600, fontSize: 12 },
  row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  input: { background: "#fff", border: `2px solid ${INK}`, borderRadius: 10, padding: "10px 12px", color: INK, fontSize: 15, fontWeight: 700, flex: 1, minWidth: 0 },
  primary: { background: "#ffe600", color: INK, border: `2px solid ${INK}`, borderRadius: 10, padding: "13px 16px", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: `3px 3px 0 ${INK}` },
  secondary: { background: "#5b5bff", color: "#fff", border: `2px solid ${INK}`, borderRadius: 10, padding: "11px 14px", fontWeight: 800, cursor: "pointer", boxShadow: `3px 3px 0 ${INK}` },
  ghost: { background: "transparent", color: INK, border: `2px solid ${INK}`, borderRadius: 10, padding: "7px 12px", fontWeight: 800, cursor: "pointer" },
  danger: { background: "#e5333a", color: "#fff", border: `2px solid ${INK}`, borderRadius: 10, padding: "11px 14px", fontWeight: 800, cursor: "pointer", boxShadow: `3px 3px 0 ${INK}` },
  chip: { background: "#fff", color: INK, border: `2px solid ${INK}`, borderRadius: 999, padding: "8px 14px", fontWeight: 800, cursor: "pointer" },
  chipOn: { background: "#ff4fcb", color: "#fff", border: `2px solid ${INK}`, borderRadius: 999, padding: "8px 14px", fontWeight: 800, cursor: "pointer", boxShadow: `2px 2px 0 ${INK}` },
  fee: { color: "#8a8a85", fontSize: 12, fontWeight: 600 },
  timer: { fontSize: 48, fontWeight: 900, fontFamily: "ui-monospace, monospace", letterSpacing: -1 },
  statusRow: { display: "flex", alignItems: "center", gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 999, background: "#1bbf73", boxShadow: "0 0 0 4px rgba(27,191,115,0.18)" },
  connectedText: { fontWeight: 900, fontSize: 18, color: "#1bbf73", letterSpacing: -0.3 },
  ipRow: { fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "#3a3a38" },
  ipChip: { fontFamily: "ui-monospace, monospace", background: "#eeeeff", border: `2px solid ${INK}`, borderRadius: 8, padding: "3px 10px", fontWeight: 800 },
  activityMsg: { fontSize: 12, fontWeight: 800, color: "#5b5bff" },
  ok: { color: "#1bbf73", fontSize: 13, fontWeight: 700 },
  err: { color: "#e5333a", fontSize: 13, fontWeight: 700, wordBreak: "break-word" },
  warn: { color: "#ff7a00", fontSize: 13, fontWeight: 700 },
  errBox: {
    background: "#ffecec", border: "2px solid #e5333a", color: "#b3202a", borderRadius: 12,
    padding: "10px 14px", fontSize: 13, fontWeight: 800, boxShadow: "3px 3px 0 #e5333a", wordBreak: "break-word",
  },
  okBox: {
    background: "#eafff3", border: "2px solid #1bbf73", color: "#0f7a4a", borderRadius: 12,
    padding: "10px 14px", fontSize: 13, fontWeight: 800, boxShadow: "3px 3px 0 #1bbf73", wordBreak: "break-word",
  },
};
