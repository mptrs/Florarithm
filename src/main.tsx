import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('No #root element to mount into')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support. Registered after load so it never competes with the first
// paint — which, on the critical path between tapping a sticker and logging a
// watering, is the only thing that matters.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  })
}
