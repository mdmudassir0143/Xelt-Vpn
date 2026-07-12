// 🧪 TEMPORARY — Magic + Particle UA validation inside the Tauri WebView.
// Rendered instead of <App/> when VITE_WEBVIEW_TEST=1 (see main.tsx). Delete after we
// know whether Magic's iframe login works in WKWebView. If it does → in-app flow; if it
// throws (iframe/storage blocked) → we use the system-browser + callback rail instead.

import { useState, useEffect, useRef } from 'react';
import { login, initUA, getUnifiedBalance, quoteFeeUSD, getOwner } from './wallet';

export default function MagicWebViewTest() {
  const [email, setEmail] = useState('');
  const [eoa, setEoa] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const say = (m: string) => setLog((l) => [...l, m]);
  const logRef = useRef<HTMLPreElement>(null);

  // Auto-scroll the log to the newest line.
  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [log]);

  async function loginInit() {
    try {
      say(`opening Magic login for ${email}…  (watch for the OTP iframe)`);
      const addr = await login(email);
      setEoa(addr);
      say(`✅ Magic login OK in WebView — EOA ${addr}`);
      initUA();
      say('✅ UniversalAccount initialized (useEIP7702) in WebView');
    } catch (e: any) {
      say(`❌ login/init failed: ${e?.message ?? e}`);
      say('   → if this is an iframe/storage error, Magic is blocked in the WebView (use browser-callback rail).');
    }
  }

  async function readBalance() {
    try {
      const b = await getUnifiedBalance();
      say(`💰 unified balance $${b.usd.toFixed(4)} (Arbitrum USDC: ${b.arbitrumUsdc})`);
    } catch (e: any) {
      say(`❌ balance failed: ${e?.message ?? e}`);
    }
  }

  async function quote() {
    try {
      say(`owner: ${getOwner()}`);
      const fee = await quoteFeeUSD('1');
      say(`🧾 quote OK — UA fee for a $1 settle: $${fee.toFixed(4)} (free, no send)`);
    } catch (e: any) {
      say(`❌ quote failed: ${e?.message ?? e}`);
    }
  }

  return (
    <div
      style={{
        fontFamily: 'monospace', color: '#eee', background: '#0b0b0b',
        height: '100vh', overflowY: 'auto', boxSizing: 'border-box', padding: 16,
      }}
    >
      <h2 style={{ margin: '0 0 6px' }}>🧪 Magic + Particle UA — Tauri WebView test</h2>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        Does Magic's email login work inside the app's WebView? Run each step and report the log.
      </p>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0', flexWrap: 'wrap' }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: 8 }}
        />
        <button onClick={loginInit}>1. Login + init UA</button>
        <button onClick={readBalance}>2. Read balance</button>
        <button onClick={quote}>3. Quote fee (free)</button>
        <button onClick={() => setLog([])}>Clear</button>
      </div>
      {eoa && <p style={{ wordBreak: 'break-all', fontSize: 13 }}>EOA: <b>{eoa}</b></p>}
      <pre
        ref={logRef}
        style={{
          background: '#000', color: '#0f0', padding: 12, borderRadius: 6, fontSize: 12,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          maxHeight: '50vh', overflowY: 'auto',
        }}
      >
        {log.join('\n') || '(logs appear here)'}
      </pre>
    </div>
  );
}
