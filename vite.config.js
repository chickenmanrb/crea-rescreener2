import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Import the plugin

// https://vitejs.dev/config/
export default defineConfig({
  // Add the plugin to the plugins array
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions')
      }
    }
  }
})
