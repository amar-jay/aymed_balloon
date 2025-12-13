import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  loadEnv(mode) // environment variables aren't automatically loaded, so we load them here
  return {
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
      envPrefix: 'ELECTRON_',
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
  }
})
