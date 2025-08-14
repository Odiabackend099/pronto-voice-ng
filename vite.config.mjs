// vite.config.mjs  force alias for ESM-only package and exclude from optimizeDeps
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'lovable-tagger': path.resolve(__dirname, 'src/shims/lovable-tagger.js')
    }
  },
  optimizeDeps: {
    exclude: ['lovable-tagger']
  }
})
