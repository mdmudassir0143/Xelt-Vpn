import { Reveal, RevealItem, MagneticButton, PaintBlob } from './primitives';

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-paper px-5 py-28 md:py-36">
      <PaintBlob
        color="#5B5BFF"
        className="pointer-events-none absolute left-1/4 top-0 h-72 w-72 opacity-20"
      />
      <PaintBlob
        color="#FF7A00"
        className="pointer-events-none absolute right-1/4 bottom-0 h-64 w-64 opacity-20"
      />
      <PaintBlob
        color="#FF4FCB"
        className="pointer-events-none absolute right-10 top-20 h-44 w-44 opacity-20"
      />

      <Reveal className="relative mx-auto max-w-4xl text-center">
        <RevealItem className="mb-5 inline-flex tape rounded-lg bg-paper px-4 py-2 font-mono text-[12px] text-ink/70">
          your first minute is one tap away
        </RevealItem>
        <RevealItem
          as="div"
          className="font-display text-[clamp(2.6rem,9vw,6rem)] font-bold leading-[0.9] tracking-tightest"
        >
          RENT PRIVACY <br />
          <span className="text-splash">BY THE MINUTE.</span>
        </RevealItem>
        <RevealItem as="p" className="mx-auto mt-6 max-w-md leading-relaxed text-ink/65">
          Log in with your email, top up in USDC, pick your minutes, and pay for
          your first encrypted minute gasless. No password to remember.
        </RevealItem>
        <RevealItem className="mt-9 flex flex-wrap justify-center gap-3">
          <MagneticButton
            variant="solid"
            icon={<Arrow />}
            onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Join waitlist
          </MagneticButton>
          <MagneticButton variant="outline">Read the docs</MagneticButton>
        </RevealItem>
      </Reveal>
    </section>
  );
}

const FOOTER_COLS = [
  { head: 'Product', links: ['How it works', 'Pricing', 'Download', 'FAQ'] },
  { head: 'Build', links: ['Quickstart', 'boringtun', 'GitHub'] },
  { head: 'Protocol', links: ['x402', 'USDC on Arbitrum', 'Particle UA', 'WireGuard'] },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t-2 border-ink bg-ink px-5 pb-10 pt-16 text-paper">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <span className="font-graffiti text-6xl leading-none tracking-wide">
              Xelt
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/55">
              A pay by the minute VPN. x402 payments in USDC on Arbitrum,
              encrypted with WireGuard. No passwords, no subscriptions.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.head}>
              <h4 className="mb-4 font-mono text-[12px] uppercase tracking-widest text-paper/45">
                {col.head}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-paper/75 transition-colors hover:text-sun"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 font-mono text-[12px] text-paper/45 sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} Xelt · USDC on Arbitrum ·
            WireGuard
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            settled on Arbitrum One
          </span>
        </div>
      </div>
    </footer>
  );
}

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 11L11 3M11 3H5M11 3V9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
