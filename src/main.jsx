import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import './extraText'
import App from './App.jsx'
import { applyBrand } from './theme'
import { getPlatform, loadPlatform } from './platform'
import { ToastHost } from './shared'

applyBrand(getPlatform().color)

// Lets the app open with no internet (see public/sw.js).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        // Keep what this very visit already loaded, so the next visit works offline too.
        const c = await caches.open('hms-shell-v1')
        const mine = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin))
        await Promise.all([...new Set([location.origin + '/index.html', ...mine])].map((u) => c.add(u).catch(() => {})))
      })
      .catch(() => {})
  })
}
loadPlatform()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ToastHost />
  </StrictMode>,
)
