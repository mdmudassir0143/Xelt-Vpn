import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Standalone build for the marketing landing page ONLY.
//
// The main vite.config.ts bundles two entries (the Tauri app + the landing page).
// The app entry pulls in the wallet SDKs (Magic, Particle Universal Accounts, viem)
// plus wasm and node polyfills that a static host does not need. The landing page
// imports none of that, so this config builds just landing.html for a clean,
// lightweight deploy. Works on GitHub Pages and Vercel.
//
// `base: './'` keeps asset paths relative, so it serves correctly both at a domain root (Vercel)
// and from a GitHub Pages project subpath (user.github.io/repo/). The build emits dist/landing.html;
// GitHub Pages serves index.html at the root, so the Pages workflow copies landing.html to index.html.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { global: 'globalThis' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: resolve(__dirname, 'landing.html'),
    },
  },
});
