import { Reveal, RevealItem, PaintBlob } from './primitives';

const STATS = [
  { value: '402', label: 'the handshake that opens your tunnel', accent: 'text-sun' },
  { value: '$0.02', label: 'in USDC per minute, pay as you go', accent: 'text-pink' },
  { value: '60', label: 'minutes max, or as few as one', accent: 'text-sky' },
  { value: '0', label: 'gas, passwords or subscriptions', accent: 'text-paper' },
];

export function Stats() {
  return (
    <section
      id="pricing"
      className="edge-angle-b edge-angle-t relative overflow-hidden bg-indigo px-5 py-28 text-paper md:py-36"
    >
      <PaintBlob
        color="#FF4FCB"
        className="pointer-events-none absolute -left-20 top-10 h-72 w-72 opacity-30"
      />
      <PaintBlob
        color="#00B3FF"
        className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 opacity-30"
      />

      <Reveal className="relative mx-auto max-w-6xl">
        <RevealItem className="mb-14 max-w-xl">
          <span className="font-mono text-[13px] uppercase tracking-widest text-paper/70">
            Pricing, by the numbers
          </span>
          <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[0.98] tracking-tightest">
            Privacy priced by the minute, paid in USDC on Arbitrum.
          </h2>
        </RevealItem>

        <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4">
          {STATS.map((s) => (
            <RevealItem key={s.label}>
              <div
                className={`font-graffiti text-[clamp(3.5rem,9vw,6rem)] leading-none ${s.accent}`}
              >
                {s.value}
              </div>
              <div className="mt-2 max-w-[14ch] font-mono text-[13px] leading-snug text-paper/75">
                {s.label}
              </div>
            </RevealItem>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
