import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [wasm()],
  server: {
    open: true,
    host: true,
    port: 3000,
  },
  assetsInclude: ['**/*.hdr'], // Add this line to include .hdr files as assets
});