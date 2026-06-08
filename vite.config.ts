import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local-first SPA. No backend required — everything persists in the browser.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true, open: false },
  preview: { port: 4173, host: true },
})
