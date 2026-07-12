import { motion } from 'framer-motion';
import { MagneticButton } from './primitives';

const LINKS = [
  { label: 'How it works', href: '#flow' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '#code' },
];

export function Nav() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav className="flex w-full max-w-6xl items-center justify-between rounded-full border border-ink/10 bg-paper/80 py-2.5 pl-5 pr-2.5 shadow-[0_8px_30px_rgba(10,10,10,0.06)] backdrop-blur-md">
        <a href="#top" className="flex items-center gap-2" aria-label="Xelt home">
          <span className="relative grid h-7 w-7 place-items-center rounded-full bg-ink">
            <span className="h-2 w-2 rounded-full bg-sun" />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-pink" />
          </span>
          <span className="font-graffiti text-2xl leading-none tracking-wide">
            Xelt
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-full px-4 py-2 font-mono text-[13px] text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        <MagneticButton
          variant="solid"
          className="!px-5 !py-2.5 !text-[13px]"
          icon={<Arrow />}
        >
          Get the app
        </MagneticButton>
      </nav>
    </motion.header>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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
