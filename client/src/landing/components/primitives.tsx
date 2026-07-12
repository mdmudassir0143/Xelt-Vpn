import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import {
  forwardRef,
  useRef,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ */
/* Reveal — staggered entrance as content scrolls into view.          */
/* ------------------------------------------------------------------ */

const revealParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const revealChild: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Reveal({
  children,
  className,
  as = 'div',
  amount = 0.3,
}: PropsWithChildren<{
  className?: string;
  as?: 'div' | 'section' | 'ul' | 'header';
  amount?: number;
}>) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={revealParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </MotionTag>
  );
}

/** A single staggered child. Use inside <Reveal>. */
export function RevealItem({
  children,
  className,
  as = 'div',
}: PropsWithChildren<{ className?: string; as?: 'div' | 'li' | 'span' | 'p' | 'a' }>) {
  const MotionTag = motion[as];
  return (
    <MotionTag className={className} variants={revealChild}>
      {children}
    </MotionTag>
  );
}

/* ------------------------------------------------------------------ */
/* Word-by-word headline reveal.                                       */
/* ------------------------------------------------------------------ */

export function RevealWords({
  text,
  className,
  highlight,
}: {
  text: string;
  className?: string;
  highlight?: string;
}) {
  const words = text.split(' ');
  return (
    <motion.h1
      className={className}
      variants={{ show: { transition: { staggerChildren: 0.09 } } }}
      initial="hidden"
      animate="show"
    >
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className={
              'inline-block ' + (word === highlight ? 'text-splash' : '')
            }
            variants={{
              hidden: { y: '110%' },
              show: {
                y: 0,
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}

/* ------------------------------------------------------------------ */
/* MagneticButton — cursor-magnetic CTA with two visual variants.      */
/* ------------------------------------------------------------------ */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline';
  icon?: ReactNode;
};

export const MagneticButton = forwardRef<HTMLButtonElement, BtnProps>(
  function MagneticButton(
    { children, variant = 'solid', icon, className = '', ...rest },
    _ref
  ) {
    const ref = useRef<HTMLButtonElement>(null);
    const reduce = useReducedMotion();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 220, damping: 18 });
    const sy = useSpring(y, { stiffness: 220, damping: 18 });

    function onMove(e: React.MouseEvent<HTMLButtonElement>) {
      if (reduce) return;
      const r = ref.current!.getBoundingClientRect();
      x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
      y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
    }
    function reset() {
      x.set(0);
      y.set(0);
    }

    const base =
      'group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-display text-[15px] font-semibold tracking-tight transition-colors will-change-transform';
    const look =
      variant === 'solid'
        ? 'bg-ink text-paper hover:bg-indigo'
        : 'border-2 border-ink text-ink hover:bg-ink hover:text-paper';

    return (
      <motion.button
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{ x: sx, y: sy }}
        whileTap={{ scale: 0.96 }}
        className={`${base} ${look} ${className}`}
        {...(rest as any)}
      >
        {children}
        {icon && (
          <span className="transition-transform duration-300 ease-spring group-hover:translate-x-1">
            {icon}
          </span>
        )}
      </motion.button>
    );
  }
);

/* ------------------------------------------------------------------ */
/* Parallax — drift an element against scroll.                         */
/* ------------------------------------------------------------------ */

export function Parallax({
  children,
  speed = 60,
  className,
}: PropsWithChildren<{ speed?: number; className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Decorative SVG — abstract paint blob.                               */
/* ------------------------------------------------------------------ */

export function PaintBlob({
  color,
  className,
  animate = true,
}: {
  color: string;
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={`${className ?? ''} ${animate ? 'animate-drift' : ''}`}
    >
      <path
        fill={color}
        d="M44.7,-58.2C57.4,-49.1,66.4,-34.6,69.8,-19.1C73.2,-3.6,71,12.9,63.8,26.6C56.6,40.3,44.4,51.2,30.4,58.9C16.4,66.6,0.5,71.1,-15.9,69.5C-32.3,67.9,-49.2,60.2,-59.6,47.4C-70,34.6,-73.9,16.8,-72.6,-0.2C-71.3,-17.2,-64.8,-33.4,-53.6,-43.3C-42.4,-53.2,-26.5,-56.8,-10.6,-58.9C5.3,-61,21.9,-67.3,44.7,-58.2Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

/** A torn brush-stroke underline. */
export function BrushUnderline({ color = '#FFE600' }: { color?: string }) {
  return (
    <svg
      className="absolute -bottom-2 left-0 h-4 w-full"
      viewBox="0 0 300 16"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M2 11C40 5 90 3 150 7c50 3 100 1 148-3"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}
