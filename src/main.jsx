import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyStoredTheme } from './lib/theme.js'

// Native (Capacitor) builds load the app from a local origin, so the app's
// relative `/api/...` calls have no backend to hit. When VITE_API_BASE is set
// (mobile build only), rewrite those requests to the absolute backend in one
// place — the web build leaves this untouched (BASE is empty → no-op).
const API_BASE = import.meta.env.VITE_API_BASE || ''
if (API_BASE) {
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = API_BASE + input
    } else if (input instanceof Request && input.url.startsWith('/api')) {
      input = new Request(API_BASE + input.url, input)
    }
    return nativeFetch(input, init)
  }
}

applyStoredTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker for installability + offline app shell.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
