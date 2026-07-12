import { Reveal, RevealItem, PaintBlob } from './primitives';

export function Features() {
  return (
    <section className="relative overflow-hidden bg-paper px-5 py-24 md:py-28">
      <Reveal className="mx-auto max-w-6xl">
        <RevealItem className="mb-12 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-xl font-display text-[clamp(2rem,5vw,3.2rem)] font-bold leading-[0.98] tracking-tightest">
            Privacy you buy <br />
            <span className="text-splash">by the minute.</span>
          </h2>
        </RevealItem>

        {/* Asymmetric mosaic — each tile a different shape + color. */}
        <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-1 gap-5 md:grid-cols-6">
          {/* big feature — indigo, wide */}
          <RevealItem className="md:col-span-4 md:row-span-2">
            <article className="relative h-full overflow-hidden rounded-[28px] bg-indigo p-8 text-paper md:p-10">
              <PaintBlob
                color="#FFE600"
                className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 opacity-30"
              />
              <span className="font-mono text-[12px] uppercase tracking-widest text-paper/70">
                Pay as you go
              </span>
              <h3 className="mt-4 max-w-md font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                Buy five minutes or a full hour. When the time's up, the tunnel
                closes and you owe nothing.
              </h3>
              <p className="mt-4 max-w-sm leading-relaxed text-paper/80">
                No monthly bill and nothing that auto renews. You pay for the exact
                session you bought, about $0.02 in USDC a minute, and never more
                for time you didn't use.
              </p>
              <div className="mt-8 flex gap-2 font-mono text-[13px] text-paper/90">
                <Pill>$0.02 USDC / min</Pill>
                <Pill>1 to 60 min sessions</Pill>
              </div>
            </article>
          </RevealItem>

          {/* circle tile — pink */}
          <RevealItem className="md:col-span-2">
            <article className="relative grid h-full place-items-center overflow-hidden rounded-[28px] border-2 border-ink bg-pink/15 p-7">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-pink mix-blend-multiply opacity-40" />
              <div className="relative text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-pink text-paper">
                  <BoltIcon />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                  Just your email
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/65">
                  No passwords, no browser wallet. Magic creates your wallet from
                  an email code. Fund it once in USDC and go.
                </p>
              </div>
            </article>
          </RevealItem>

          {/* sky tile */}
          <RevealItem className="md:col-span-2">
            <article className="relative h-full overflow-hidden rounded-[28px] bg-sky/15 p-7">
              <span className="font-mono text-[12px] uppercase tracking-widest text-sky">
                Real tunnel
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                WireGuard, not a proxy
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                Modern, fast, encrypted. Powered by boringtun under the hood.
              </p>
            </article>
          </RevealItem>

          {/* blob tile — yellow, full width accent */}
          <RevealItem className="md:col-span-3">
            <article className="relative flex h-full items-center gap-5 overflow-hidden rounded-[28px] border-2 border-ink bg-sun/40 p-7">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-blob bg-ink text-sun">
                <ShieldIcon />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">
                  Settles on Arbitrum
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">
                  Every session is a real USDC transfer, settled on Arbitrum
                  through Particle Universal Accounts, final onchain. No invoices,
                  no chargebacks.
                </p>
              </div>
            </article>
          </RevealItem>

          {/* ember tile */}
          <RevealItem className="md:col-span-3">
            <article className="relative h-full overflow-hidden rounded-[28px] bg-ink p-7 text-paper">
              <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-ember opacity-80 blur-xl" />
              <span className="font-mono text-[12px] uppercase tracking-widest text-ember">
                Open protocol
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                Gasless x402 payments
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/70">
                x402 over USDC on Arbitrum. You sign in one tap and Particle Universal
                Accounts pull the gas from your USDC, so you never hold ETH. Standard
                HTTP 402, fully open.
              </p>
            </article>
          </RevealItem>
        </div>
      </Reveal>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-paper/15 px-3 py-1 backdrop-blur-sm">
      {children}
    </span>
  );
}

function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
