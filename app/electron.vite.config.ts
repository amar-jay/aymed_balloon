import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    publicDir: resolve('src/renderer/public'),
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      exclude: ['scichart']
    },
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
})
