import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const target = 'http://localhost:3001'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/hive': target,
      '/ipfs': target,
      '/bzz': target,
      '/chunks': target,
      '/bytes': target,
      '/health': target,
      '/stamps': target,
      '/addresses': target,
      '/topology': target,
      '/chainstate': target,
      '/wallet': target,
      '/readiness': target,
      '/peers': target,
      '/api/v0': target,
    },
  },
})
