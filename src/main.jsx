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
loadPlatform()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ToastHost />
  </StrictMode>,
)
