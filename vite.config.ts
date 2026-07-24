import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = fileURLToPath(new URL('.', import.meta.url))
const RUNTIME_PORT = Number(process.env.DESTINITY_PORT || 7331)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  root,
  server: {
    port: 5180,
    strictPort: false,
    proxy: {
      // The runtime owns the PTY sessions; the dev server only tunnels to it.
      '/agent-socket': { target: `ws://127.0.0.1:${RUNTIME_PORT}`, ws: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
