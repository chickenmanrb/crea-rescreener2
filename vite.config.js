import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'https://merry-blancmange-29b5cd.netlify.app',
        changeOrigin: true,
        secure: true
      }
    }
  }
  server: {
    port: 5173,
    host: true
  }
})