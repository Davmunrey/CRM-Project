import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyTheme, getInitialThemePreferenceFromStorage, applyUiDensity, getInitialUiDensityFromStorage } from './lib/theme'

applyTheme(getInitialThemePreferenceFromStorage())
applyUiDensity(getInitialUiDensityFromStorage())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
