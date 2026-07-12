// Minimal UI to exercise the spike: login → init UA → read balance → pay.
// Everything logs to an on-screen panel so we can capture the findings.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { login, logout, initUA, unifiedBalance, quote, payFor, quoteUniversal, payForUniversal, explorerUrl, CHAIN_ID } from "./wallet";

function App() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState(import.meta.env.VITE_PAY_AMOUNT ?? "0.02");
  const [eoa, setEoa] = useState<string>("");
  const [log, setLog] = useState<string[]>([]);
  const say = (m: string) => setLog((l) => [...l, m]);

  async function doLogin() {
    try {
      say(`logging in ${email}…`);
      const addr = await login(email);
      setEoa(addr);
      say(`✅ EOA = ${addr}  (fund THIS address on your source chain)`);
      initUA();
      say(`✅ UniversalAccount initialized (useEIP7702: true) on chain ${CHAIN_ID}`);
    } catch (e: any) {
      say(`❌ login/init: ${e?.message ?? e}`);
    }
  }

  async function doBalance() {
    try {
      const b = await unifiedBalance();
      say(`💰 unified balance: ${JSON.stringify(b, null, 2)}`);
    } catch (e: any) {
      say(`❌ balance: ${e?.message ?? e}`);
    }
  }

  async function doLogout() {
    await logout();
    setEoa("");
    setEmail("");
    say("👋 logged out — enter a NEW email and click Login to use a fresh account");
  }

  async function doQuote() {
    try {
      await quote(amount, say);
    } catch (e: any) {
      say(`❌ quote (free) failed at ${amount}: ${e?.message ?? e}${e?.code ? ` [${e.code}]` : ""}`);
    }
  }

  async function doQuoteUniversal() {
    try { await quoteUniversal(amount, say); }
    catch (e: any) { say(`❌ universal quote failed at ${amount}: ${e?.message ?? e}${e?.code ? ` [${e.code}]` : ""}`); }
  }

  async function doPayUniversal() {
    try {
      say(`paying ${amount} USDC via createUniversalTransaction (settling on ${CHAIN_ID})…`);
      const r: any = await payForUniversal(amount, say);
      say(`✅ sent (universal). transactionId = ${r?.transactionId ?? JSON.stringify(r)}`);
      if (r?.transactionId) say(`🔗 ${explorerUrl(r.transactionId)}`);
    } catch (e: any) {
      say(`❌ pay-universal: ${e?.message ?? e}${e?.code ? ` [${e.code}]` : ""}`);
      console.error(e);
    }
  }

  async function doPay() {
    try {
      say(`paying ${amount} USDC (sourced cross-chain, settling on ${CHAIN_ID})…`);
      const r: any = await payFor(amount, say);
      say(`✅ settled. transactionId = ${r?.transactionId ?? JSON.stringify(r)}`);
      if (r?.transactionId) say(`🔗 ${explorerUrl(r.transactionId)}`);
    } catch (e: any) {
      say(`❌ pay: ${e?.message ?? e}`);
      if (e?.code !== undefined) say(`   code: ${e.code}`);
      const detail = e?.response?.data ?? e?.data ?? e?.cause;
      if (detail) say(`   detail: ${JSON.stringify(detail)}`);
      try {
        const full = JSON.stringify(e, Object.getOwnPropertyNames(e));
        if (full && full !== "{}") say(`   full: ${full}`);
      } catch {}
      console.error(e);
    }
  }

  return (
    <div style={{ fontFamily: "monospace", maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h2>Xelt spike — Magic + Particle UA (EIP-7702)</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1 }} />
        <button onClick={doLogin}>1. Login + init UA</button>
        <button onClick={doLogout}>Logout</button>
      </div>
      {eoa && <p>EOA: <b>{eoa}</b></p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={doBalance}>2. Read unified balance</button>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 80 }} />
        <button onClick={doQuote}>Quote (free)</button>
        <button onClick={doPay}>3. Pay (cross-chain → settle)</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>NEW (demo method) →</span>
        <button onClick={doQuoteUniversal}>Quote Universal (free)</button>
        <button onClick={doPayUniversal}>Pay Universal</button>
      </div>
      <pre style={{ background: "#111", color: "#0f0", padding: 12, whiteSpace: "pre-wrap", minHeight: 240 }}>
        {log.join("\n")}
      </pre>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
