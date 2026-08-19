import { useEffect, useState } from 'react';
import { WAITLIST_TOTAL, WAITLIST_DAILY } from './waitlistData';
import { fetchTreasuryStats, type OnchainStats } from './onchain';

const AUTH_KEY = 'xelt_admin_ok';
const ADMIN_EMAIL = 'xelt@ceo.com';
const ADMIN_PASS = 'xelt.ceo';
const TREASURY = '0x3d2b05eE2457B174DE4dC53e714db52B1F8B4573';

export function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  if (!authed) {
    return <Login onOk={() => { sessionStorage.setItem(AUTH_KEY, '1'); setAuthed(true); }} />;
  }
  return <Dashboard onLogout={() => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); }} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(false);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL && pass === ADMIN_PASS) onOk();
    else setErr(true);
  }
  return (
    <main className="grain flex min-h-screen items-center justify-center bg-dotgrid bg-paper px-5 text-ink">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[24px] border-2 border-ink bg-paper p-8 shadow-[10px_10px_0_#0A0A0A]">
        <div className="flex items-center gap-2.5">
          <span className="font-graffiti text-3xl leading-none">Xelt</span>
          <span className="rounded-full border-2 border-ink bg-sun/50 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide">admin</span>
        </div>
        <p className="mt-4 font-mono text-[13px] text-ink/60">Sign in to view the dashboard.</p>
        <input
          type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(false); }}
          placeholder="email" aria-label="Email"
          className="mt-5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-2.5 font-mono text-[14px] outline-none placeholder:text-ink/40"
        />
        <input
          type="password" value={pass} onChange={(e) => { setPass(e.target.value); setErr(false); }}
          placeholder="password" aria-label="Password"
          className="mt-3 w-full rounded-xl border-2 border-ink bg-paper px-4 py-2.5 font-mono text-[14px] outline-none placeholder:text-ink/40"
        />
        {err && <p className="mt-3 font-mono text-[12px] text-pink">Wrong email or password.</p>}
        <button type="submit" className="mt-5 w-full rounded-xl bg-ink px-6 py-3 font-display text-[15px] font-semibold text-paper transition-colors hover:bg-indigo">
          Enter dashboard
        </button>
      </form>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<OnchainStats | null>(null);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTreasuryStats((p) => { if (alive) setProg(p); })
      .then((s) => { if (alive) setStats(s); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  const money = (n?: number) => (n == null ? '…' : `$${n.toFixed(2)}`);
  const num = (n?: number) => (n == null ? '…' : String(n));

  return (
    <main className="grain min-h-screen bg-dotgrid bg-paper px-5 py-8 text-ink md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-graffiti text-3xl leading-none">Xelt</span>
            <span className="rounded-full border-2 border-ink bg-sun/50 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide">admin</span>
          </div>
          <button onClick={onLogout} className="rounded-full border-2 border-ink px-4 py-1.5 font-mono text-[12px] font-medium transition-colors hover:bg-ink hover:text-paper">
            Log out
          </button>
        </header>

        {/* KPIs */}
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="Waitlist signups" value={String(WAITLIST_TOTAL)} sub="across 8 Indian cities" accent="bg-pink" />
          <Kpi label="Revenue (onchain)" value={money(stats?.revenueUsd)} sub={`${num(stats?.minutesSold)} minutes sold`} accent="bg-indigo" />
          <Kpi label="Sessions" value={num(stats?.sessions)} sub={stats ? `avg $${stats.avgUsd.toFixed(3)}` : 'paid connects'} accent="bg-sky" />
          <Kpi label="Unique users" value="8" sub="magic wallets" accent="bg-ember" />
        </section>
        {!stats && !err && <p className="mt-3 font-mono text-[12px] text-ink/45">loading onchain data… {Math.round(prog * 100)}%</p>}
        {err && <p className="mt-3 font-mono text-[12px] text-pink">could not load onchain data (RPC). Waitlist metrics still shown.</p>}

        {/* Waitlist */}
        <section className="mt-8 rounded-[24px] border-2 border-ink bg-paper p-6 shadow-[8px_8px_0_#0A0A0A] md:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight">Waitlist</h2>
            <span className="font-mono text-[12px] uppercase tracking-widest text-ink/50">daily signups · August 2026</span>
          </div>
          <div className="mt-6"><WaitlistChart /></div>
        </section>

        {/* On-chain recent activity */}
        <section className="mt-8 rounded-[24px] border-2 border-ink bg-paper p-6 shadow-[8px_8px_0_#0A0A0A] md:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight">Live on Arbitrum</h2>
            <a href={`https://arbiscan.io/address/${TREASURY}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[12px] text-indigo underline">treasury ↗</a>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] font-mono text-[13px]">
              <thead>
                <tr className="border-b-2 border-dashed border-ink/20 text-left text-ink/50">
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Payer</th>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 text-right font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.txns ?? []).slice(0, 10).map((t) => (
                  <tr key={t.hash} className="border-b border-ink/10">
                    <td className="py-2.5 font-semibold">${t.amountUsd.toFixed(2)}</td>
                    <td className="py-2.5">{short(t.from)}</td>
                    <td className="py-2.5 text-ink/60">
                      {t.ts ? new Date(t.ts * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'n/a'}
                    </td>
                    <td className="py-2.5 text-right">
                      <a href={`https://arbiscan.io/tx/${t.hash}`} target="_blank" rel="noopener noreferrer" className="text-indigo underline">{t.hash.slice(0, 8)}… ↗</a>
                    </td>
                  </tr>
                ))}
                {stats && stats.txns.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-ink/45">no payments found in range</td></tr>
                )}
                {!stats && !err && [0, 1, 2, 3].map((i) => (
                  <tr key={i}><td colSpan={4} className="py-2.5 text-ink/30">loading…</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-center font-mono text-[11px] text-ink/40">
          Xelt admin · onchain data live from Arbitrum · waitlist via Formspree
        </p>
      </div>
    </main>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border-2 border-ink bg-paper p-5 shadow-[5px_5px_0_#0A0A0A]">
      <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${accent}`} />
      <div className="font-mono text-[11px] uppercase tracking-widest text-ink/50">{label}</div>
      <div className="mt-2 font-display text-[clamp(1.8rem,5vw,2.6rem)] font-bold leading-none tracking-tightest">{value}</div>
      {sub && <div className="mt-1.5 font-mono text-[12px] text-ink/55">{sub}</div>}
    </div>
  );
}

function WaitlistChart() {
  const data = WAITLIST_DAILY;
  const max = Math.max(...data.map((d) => d.n));
  const W = 560, H = 170, padX = 8, padTop = 18, padBottom = 24;
  const bw = (W - padX * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily waitlist signups">
      {data.map((d, i) => {
        const bh = (d.n / max) * (H - padTop - padBottom);
        const x = padX + i * bw;
        const y = H - padBottom - bh;
        return (
          <g key={d.date}>
            <rect x={x + 3} y={y} width={bw - 6} height={Math.max(bh, 1)} rx="3" fill="#5B5BFF" />
            <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="9.5" fontFamily="monospace" fill="#0A0A0A">{d.n}</text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0A0A0A" opacity="0.5">{d.date.slice(8)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function short(a: string, n = 6): string {
  return a && a.length > 2 * n + 1 ? `${a.slice(0, n)}…${a.slice(-4)}` : a;
}
