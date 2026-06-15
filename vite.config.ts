import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `process` without @types/node — declare the slice we use so typecheck stays clean.
declare const process: { env: Record<string, string | undefined> }

// Local-first SPA. No backend required — everything persists in the browser.
// BASE_PATH lets the same build deploy at root (server/Docker/Netlify/Vercel)
// or under a sub-path (e.g. GitHub Pages: BASE_PATH=/type-genius/).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  // `.trycloudflare.com` allows any quick-tunnel subdomain (URL rotates each run).
  server: { port: 5173, host: true, open: false, allowedHosts: ['.trycloudflare.com'] },
  preview: { port: 4173, host: true },
  build: { target: 'es2020', sourcemap: false },
})
