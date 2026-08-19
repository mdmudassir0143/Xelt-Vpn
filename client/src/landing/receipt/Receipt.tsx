// Branded payment receipt, opened in the system browser after a successful connect.
// Pure web (no Tauri): it reads the transaction + session details from the URL query string
// (see client/src/utils/receipt.ts) and renders them in the Xelt brand style.

function q(name: string): string {
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

function shorten(addr: string, n = 6): string {
  return addr && addr.length > 2 * n + 1 ? `${addr.slice(0, n)}…${addr.slice(-n)}` : addr || 'n/a';
}

function formatWhen(raw: string): string {
  if (!raw) return 'n/a';
  const d = new Date(/^\d+$/.test(raw) ? Number(raw) : raw);
  return isNaN(d.getTime())
    ? 'n/a'
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function Receipt() {
  const amount = q('amount');
  const tx = q('tx');
  const payer = q('payer');
  const payee = q('payee');
  const minutes = q('minutes');
  const expires = q('expires');
  const ip = q('ip');
  const arbiscan = tx ? `https://arbiscan.io/tx/${tx}` : '';

  return (
    <main className="grain relative flex min-h-screen items-center justify-center bg-dotgrid bg-paper px-5 py-16 text-ink">
      <Blob color="#5B5BFF" className="pointer-events-none absolute -left-24 top-8 h-72 w-72 opacity-15" />
      <Blob color="#FFE600" className="pointer-events-none absolute -right-16 bottom-8 h-64 w-64 opacity-25" />

      <div className="relative w-full max-w-md rounded-[28px] border-2 border-ink bg-paper p-7 shadow-[10px_10px_0_#0A0A0A] md:p-9">
        {/* header */}
        <div className="flex items-center justify-between">
          <span className="font-graffiti text-3xl leading-none tracking-wide">Xelt</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sun/50 px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-wide">
            <Check /> paid
          </span>
        </div>

        {/* amount */}
        <div className="mt-8">
          <div className="font-mono text-[12px] uppercase tracking-widest text-ink/50">amount paid</div>
          <div className="mt-1 font-display text-[clamp(2.6rem,11vw,3.6rem)] font-bold leading-none tracking-tightest">
            ${amount || '0.00'} <span className="text-splash">USDC</span>
          </div>
          <div className="mt-1.5 font-mono text-[13px] text-ink/55">
            {minutes ? `${minutes} minutes of encrypted VPN` : 'encrypted VPN session'}
          </div>
        </div>

        {/* details */}
        <dl className="mt-8 space-y-3 border-t-2 border-dashed border-ink/20 pt-6 font-mono text-[13px]">
          <Row k="Network" v="Arbitrum One" />
          <Row k="From" v={shorten(payer)} />
          <Row k="To (treasury)" v={shorten(payee)} />
          {ip && <Row k="Assigned IP" v={ip} />}
          <Row k="Session ends" v={formatWhen(expires)} />
          <Row k="Transaction" v={shorten(tx, 8)} />
        </dl>

        {/* Arbiscan */}
        {arbiscan && (
          <a
            href={arbiscan}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-display text-[15px] font-semibold text-paper transition-colors hover:bg-indigo"
          >
            View on Arbiscan
            <span className="transition-transform duration-300 ease-spring group-hover:translate-x-1">
              <Arrow />
            </span>
          </a>
        )}

        <p className="mt-6 text-center font-mono text-[11px] leading-relaxed text-ink/45">
          Settled onchain via Particle Universal Accounts. A real USDC payment on Arbitrum,
          verifiable at the link above.
        </p>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink/50">{k}</dt>
      <dd className="truncate text-right font-medium">{v || 'n/a'}</dd>
    </div>
  );
}

function Blob({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={`${className ?? ''} animate-drift`}>
      <path
        fill={color}
        d="M44.7,-58.2C57.4,-49.1,66.4,-34.6,69.8,-19.1C73.2,-3.6,71,12.9,63.8,26.6C56.6,40.3,44.4,51.2,30.4,58.9C16.4,66.6,0.5,71.1,-15.9,69.5C-32.3,67.9,-49.2,60.2,-59.6,47.4C-70,34.6,-73.9,16.8,-72.6,-0.2C-71.3,-17.2,-64.8,-33.4,-53.6,-43.3C-42.4,-53.2,-26.5,-56.8,-10.6,-58.9C5.3,-61,21.9,-67.3,44.7,-58.2Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 11L11 3M11 3H5M11 3V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
