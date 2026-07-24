import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App.tsx'
import { startWire } from '@/lib/wire.ts'
import '@/styles/app.css'

startWire()

const root = document.getElementById('root')
if (!root) throw new Error('#root missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
