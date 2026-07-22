import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    // Strip console.* and debugger from production bundles. Combined with the
    // "never log tokens/PII" rule in the code itself, this is belt-and-braces:
    // even an accidental console.log of a token can't reach a production build.
    minify: 'esbuild',
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
