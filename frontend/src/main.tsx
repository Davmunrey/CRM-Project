import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyTheme, getInitialThemePreferenceFromStorage, applyUiDensity, getInitialUiDensityFromStorage } from './lib/theme'
import { initSentry } from './lib/sentry'
import { installTraceFetch } from './lib/traceFetch'

initSentry()
installTraceFetch()
applyTheme(getInitialThemePreferenceFromStorage())
applyUiDensity(getInitialUiDensityFromStorage())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
