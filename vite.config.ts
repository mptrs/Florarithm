import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The app is served from https://mptrs.github.io/Florarithm/, so every asset URL
// needs that prefix. Routing stays in the hash — see src/lib/router.ts.
export default defineConfig({
  base: '/Florarithm/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // fileURLToPath rather than `.pathname`: the project path can contain a
    // space, and a raw pathname hands back %20.
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { target: 'es2022' },
})
