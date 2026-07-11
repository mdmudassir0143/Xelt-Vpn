/** @type {import('tailwindcss').Config} */
export default {
  // Scope Tailwind strictly to the landing page so it never touches the
  // existing Tauri app (index.html / pay.html) which uses its own plain CSS.
  content: ['./landing.html', './src/landing/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAFAF8',
        ink: '#0A0A0A',
        indigo: '#5B5BFF',
        pink: '#FF4FCB',
        sun: '#FFE600',
        sky: '#00B3FF',
        ember: '#FF7A00',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        graffiti: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        body: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
      borderRadius: {
        blob: '42% 58% 63% 37% / 41% 44% 56% 59%',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '33%': { transform: 'translate(20px, -18px) rotate(6deg)' },
          '66%': { transform: 'translate(-16px, 12px) rotate(-5deg)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        spinslow: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        drift: 'drift 22s ease-in-out infinite',
        marquee: 'marquee 32s linear infinite',
        spinslow: 'spinslow 28s linear infinite',
      },
    },
  },
  plugins: [],
};
