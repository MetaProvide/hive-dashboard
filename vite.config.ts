import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const nodeUrl = process.env.NODE_URL || 'http://localhost:4774'

export default defineConfig({
  plugins: [vue()],
  define: {
    __NODE_URL__: JSON.stringify(nodeUrl),
  },
  server: {
    port: 5173,
    proxy: {
      '/hive': nodeUrl,
      '/ipfs': nodeUrl,
      '/bzz': nodeUrl,
      '/chunks': nodeUrl,
      '/bytes': nodeUrl,
      '/health': nodeUrl,
      '/stamps': nodeUrl,
      '/addresses': nodeUrl,
      '/topology': nodeUrl,
      '/chainstate': nodeUrl,
      '/wallet': nodeUrl,
      '/readiness': nodeUrl,
      '/peers': nodeUrl,
      '/api/v0': nodeUrl,
    },
  },
})
