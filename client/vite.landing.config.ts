import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Standalone build for the marketing landing page ONLY.
//
// The main vite.config.ts bundles two entries (the Tauri app + the landing page).
// The app entry pulls in the wallet SDKs (Magic, Particle Universal Accounts, viem)
// plus wasm and node polyfills that a static host does not need. The landing page
// imports none of that, so this config builds just landing.html for a clean,
// lightweight deploy. Used for Vercel.
//
// Output is dist/landing.html; vercel.json rewrites "/" to "/landing.html".
export default defineConfig({
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
