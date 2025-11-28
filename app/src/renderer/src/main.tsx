import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SciChartSurface } from 'scichart/index.min.mjs'

// Initialize SciChart with WASM location
SciChartSurface.configure({
  wasmUrl: '/scichart2d.wasm'
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
