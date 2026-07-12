import { motion } from 'framer-motion';
import {
  BrushUnderline,
  MagneticButton,
  PaintBlob,
  Parallax,
} from './primitives';

const SNIPPETS = [
  { label: 'WireGuard', accent: 'bg-indigo', rot: '-rotate-3', pos: 'left-0 top-6' },
  { label: 'Gasless x402', accent: 'bg-pink', rot: 'rotate-2', pos: 'right-2 top-0' },
  { label: 'Pay by the minute', accent: 'bg-sky', rot: 'rotate-3', pos: 'left-6 bottom-10' },
  { label: 'USDC on Arbitrum', accent: 'bg-ember', rot: '-rotate-2', pos: 'right-0 bottom-2' },
];

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-dotgrid px-5 pb-24 pt-36 md:pb-32 md:pt-44"
    >
      {/* Ambient paint splashes */}
      <PaintBlob
        color="#5B5BFF"
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 opacity-20 blur-[2px]"
      />
      <PaintBlob
        color="#FFE600"
        className="pointer-events-none absolute -right-16 top-40 h-64 w-64 opacity-30"
      />
      <PaintBlob
        color="#FF4FCB"
        className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 opacity-15"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ---- Left: thesis ---- */}
        <div>

          <h1 className="font-display text-[clamp(2.9rem,8vw,6rem)] font-bold leading-[0.92] tracking-tightest">
            <Line text="A VPN YOU" delay={0.15} />
            <span className="relative inline-block">
              <Line text="RENT" gradient delay={0.27} />
              <BrushUnderline color="#FFE600" />
            </span>
            <br />
            <Line text="BY THE MINUTE." delay={0.39} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="mt-7 max-w-md text-lg leading-relaxed text-ink/70"
          >
            Instant encrypted VPN with the <span className="font-semibold text-ink">x402 protocol.</span><br />
            Log in with email, pay in USDC, no subscriptions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72, duration: 0.7 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <MagneticButton variant="solid" icon={<Arrow />}>
              Get the app
            </MagneticButton>
            <MagneticButton variant="outline">How it works</MagneticButton>
          </motion.div>
        </div>

        {/* ---- Right: Xelt graffiti signature ---- */}
        <Parallax speed={40} className="relative">
          <div className="relative mx-auto aspect-square w-full max-w-md">
            {/* spinning ring */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full animate-spinslow text-ink/15"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.4"
                strokeDasharray="2 4"
              />
            </svg>

            {/* color blobs behind the wordmark */}
            <div className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-blob bg-gradient-to-br from-indigo via-pink to-ember opacity-90" />
            <div className="absolute left-[14%] top-[10%] h-24 w-24 rounded-full bg-sun mix-blend-multiply" />
            <div className="absolute bottom-[12%] right-[10%] h-20 w-20 rounded-full bg-sky mix-blend-multiply" />

            {/* graffiti wordmark */}
            <div className="absolute inset-0 grid place-items-center">
              <span className="select-none font-graffiti text-[clamp(5rem,18vw,11rem)] leading-none tracking-wide text-paper drop-shadow-[4px_6px_0_rgba(10,10,10,0.9)]">
                Xelt
              </span>
            </div>

            {/* tiny floating symbols */}
            <Symbol char="✺" className="left-2 top-1/3 text-sun" />
            <Symbol char="✦" className="right-4 top-8 text-paper" />
            <Symbol char="→" className="bottom-6 left-10 text-paper" />
          </div>

          {/* Floating UI snippet stickers */}
          {SNIPPETS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.12, type: 'spring', stiffness: 200 }}
              className={`absolute ${s.pos} ${s.rot} animate-float`}
              style={{ animationDelay: `${i * 0.7}s` }}
            >
              <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-paper px-3 py-2 shadow-[3px_3px_0_#0A0A0A]">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-md ${s.accent} text-paper`}
                >
                  <Check />
                </span>
                <span className="font-mono text-[12px] font-medium">
                  {s.label}
                </span>
              </div>
            </motion.div>
          ))}
        </Parallax>
      </div>
    </section>
  );
}

function Line({
  text,
  gradient,
  delay,
}: {
  text: string;
  gradient?: boolean;
  delay: number;
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`inline-block ${gradient ? 'text-splash' : ''}`}
      >
        {text}
      </motion.span>
    </span>
  );
}

function Symbol({ char, className }: { char: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute animate-float font-graffiti text-3xl ${className}`}
    >
      {char}
    </span>
  );
}

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.5L5 9L9.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
