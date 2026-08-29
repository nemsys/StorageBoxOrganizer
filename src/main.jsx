import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initNative } from './native'
import { TranslationProvider } from './translations'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </StrictMode>,
)

// Set up native (Capacitor) integrations; no-op in the browser.
initNative()

// Cache the app shell so the app opens without a network. Production only: in
// dev a service worker would sit between vite and the page and serve stale
// modules through HMR. /sw.js is emitted at build time — see vite.config.js.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // Not fatal: without it the app simply needs a connection to start.
      console.warn('Service worker registration failed', err)
    })
  })
}
