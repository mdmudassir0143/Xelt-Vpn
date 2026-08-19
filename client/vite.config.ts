import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      buffer: resolve(__dirname, 'node_modules/buffer/index.js'),
      process: resolve(__dirname, 'node_modules/process/browser.js'),
      util: resolve(__dirname, 'node_modules/util/util.js'),
    },
  },
  define: {
    global: 'globalThis',
  },
  clearScreen: false,
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'util',
    ],
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari15',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    assetsInlineLimit: 1024 * 1024,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
        receipt: resolve(__dirname, 'xelt-receipt.html'),
      },
    },
  },
});
