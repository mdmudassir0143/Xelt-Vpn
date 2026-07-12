import { Reveal, RevealItem, MagneticButton } from './primitives';

export function CodeShowcase() {
  return (
    <section id="code" className="relative bg-paper px-5 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* copy */}
        <Reveal>
          <RevealItem className="mb-3 flex items-center gap-3">
            <span className="h-px w-10 bg-ink" />
            <span className="font-mono text-[13px] uppercase tracking-widest text-ink/60">
              For developers
            </span>
          </RevealItem>
          <RevealItem
            as="div"
            className="font-display text-[clamp(2rem,5vw,3.2rem)] font-bold leading-[0.98] tracking-tightest"
          >
            Wrap fetch. <br />
            <span className="text-splash">Pay in USDC.</span>
          </RevealItem>
          <RevealItem as="p" className="mt-5 max-w-md leading-relaxed text-ink/70">
            Xelt speaks x402 over USDC on Arbitrum. Wrap your fetch with a Particle
            Universal Accounts signer; a 402 gets signed, settled on Arbitrum, and
            retried, handing you the WireGuard config back.
          </RevealItem>
          <RevealItem className="mt-8 flex flex-wrap gap-3">
            <MagneticButton variant="solid" icon={<Arrow />}>
              Read the quickstart
            </MagneticButton>
          </RevealItem>
        </Reveal>

        {/* editor panel */}
        <Reveal>
          <RevealItem>
            <div className="overflow-hidden rounded-2xl border-2 border-ink bg-[#0E0E12] shadow-[8px_8px_0_#5B5BFF]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <Dot className="bg-ember" />
                <Dot className="bg-sun" />
                <Dot className="bg-sky" />
                <span className="ml-2 font-mono text-[12px] text-white/40">
                  connect.ts
                </span>
              </div>
              <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed">
                <Code />
              </pre>
            </div>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}

/* Syntax-tinted code, colored from the Xelt palette. */
function Code() {
  return (
    <code className="text-white/85">
      <span className="text-white/35">// pay by the minute VPN, paid in USDC on Arbitrum (gasless)</span>
      {'\n'}
      <K>import</K> {'{ '}
      <V>wrapFetchWithPayment</V>
      {' }'} <K>from</K> <S>'@x402/fetch'</S>
      {'\n\n'}
      <K>const</K> <V>pay</V> = <F>wrapFetchWithPayment</F>(<V>fetch</V>,{' '}
      <V>signer</V>, {'{'}
      {'\n  '}
      schemes: [<K>new</K> <F>ExactArbitrumScheme</F>()], <span className="text-white/35">// USDC on Arbitrum</span>
      {'\n'}
      {'}'})
      {'\n\n'}
      <span className="text-white/35">// 402 → sign the USDC payment → settle on Arbitrum → 200</span>
      {'\n'}
      <K>const</K> <V>res</V> = <K>await</K> <F>pay</F>(
      <S>'http://localhost:4021/connect'</S>, {'{'}
      {'\n  '}
      method: <S>'POST'</S>,
      {'\n  '}
      body: <V>JSON</V>.<F>stringify</F>({'{ '}
      <V>wireguardPublicKey</V>, durationMinutes: <N>5</N>
      {' }'}),
      {'\n'}
      {'}'})
      {'\n\n'}
      <K>const</K> {'{ '}
      <V>peer</V>
      {' }'} = <K>await</K> <V>res</V>.<F>json</F>(){' '}
      <span className="text-emerald-400">// WireGuard config → tunnel up</span>
    </code>
  );
}

const K = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#FF4FCB]">{children}</span>
);
const V = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#00B3FF]">{children}</span>
);
const F = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#FFE600]">{children}</span>
);
const S = ({ children }: { children: React.ReactNode }) => (
  <span className="text-emerald-300">{children}</span>
);
const N = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#FF7A00]">{children}</span>
);

function Dot({ className }: { className: string }) {
  return <span className={`h-3 w-3 rounded-full ${className}`} />;
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
