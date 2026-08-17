import { useState } from 'react';
import { Reveal, RevealItem, PaintBlob } from './primitives';

// Signups POST here as JSON. This is a Formspree form: submit() sends { email } with
// Accept: application/json, so Formspree returns JSON (not a redirect) and emails the owner.
// To change the destination, create a form at formspree.io and swap the URL. Leave empty to
// fall back to demo mode (validate + local storage only, sends nothing).
const WAITLIST_ENDPOINT = 'https://formspree.io/f/xdenwjrn';

type Status = 'idle' | 'loading' | 'ok' | 'err';

export function Waitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus('err');
      return;
    }
    setStatus('loading');
    try {
      if (WAITLIST_ENDPOINT) {
        const res = await fetch(WAITLIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email, _subject: 'New Xelt waitlist signup' }),
        });
        if (!res.ok) throw new Error(String(res.status));
      } else {
        // Demo mode: no endpoint configured, keep it locally so nothing is lost.
        const list = JSON.parse(localStorage.getItem('xelt_waitlist') || '[]');
        list.push({ email, at: new Date().toISOString() });
        localStorage.setItem('xelt_waitlist', JSON.stringify(list));
      }
      setStatus('ok');
    } catch {
      setStatus('err');
    }
  }

  return (
    <section id="waitlist" className="relative overflow-hidden bg-paper px-5 py-28 md:py-36">
      <PaintBlob
        color="#FFE600"
        className="pointer-events-none absolute -left-16 top-10 h-64 w-64 opacity-30"
      />
      <PaintBlob
        color="#FF4FCB"
        className="pointer-events-none absolute -right-12 bottom-0 h-56 w-56 opacity-20"
      />

      <Reveal className="relative mx-auto max-w-2xl text-center">
        <RevealItem className="mb-5 inline-flex tape rounded-lg bg-paper px-4 py-2 font-mono text-[12px] text-ink/70">
          private beta
        </RevealItem>

        <RevealItem
          as="div"
          className="font-display text-[clamp(2.4rem,7vw,4.6rem)] font-bold leading-[0.95] tracking-tightest"
        >
          Be first through <br />
          <span className="text-splash">the tunnel.</span>
        </RevealItem>

        <RevealItem as="p" className="mx-auto mt-5 max-w-md leading-relaxed text-ink/65">
          Xelt is rolling out slowly. Leave your email and we'll send an invite the moment a spot
          opens.
        </RevealItem>

        <RevealItem className="mt-9">
          {status === 'ok' ? (
            <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border-2 border-ink bg-sun/40 px-6 py-4 font-display font-semibold">
              <Check /> You're on the list. Watch your inbox.
            </div>
          ) : (
            <form onSubmit={submit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'err') setStatus('idle');
                }}
                placeholder="you@email.com"
                aria-label="Email address"
                className="flex-1 rounded-full border-2 border-ink bg-paper px-5 py-3 font-mono text-[15px] outline-none placeholder:text-ink/40 focus:shadow-[3px_3px_0_#0A0A0A]"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-full bg-ink px-7 py-3 font-display text-[15px] font-semibold text-paper transition-colors hover:bg-indigo disabled:opacity-60"
              >
                {status === 'loading' ? 'Joining…' : 'Join waitlist'}
              </button>
            </form>
          )}

          {status === 'err' && (
            <p className="mt-3 font-mono text-[13px] text-pink">Enter a valid email and try again.</p>
          )}
          <p className="mt-4 font-mono text-[12px] text-ink/45">No spam. Just your invite.</p>
        </RevealItem>
      </Reveal>
    </section>
  );
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
