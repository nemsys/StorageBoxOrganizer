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
