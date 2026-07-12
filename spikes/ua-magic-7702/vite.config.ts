import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Spike app — proves Magic + Particle UA (EIP-7702) settlement.
// nodePolyfills: web3 SDKs (Particle UA) expect Node globals (process, Buffer, global).
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ globals: { process: true, Buffer: true, global: true } }),
  ],
  server: { port: 5175 },
});
