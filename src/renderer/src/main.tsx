import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { SettingsApp } from './settings/SettingsApp'
import './styles.css'

const isSettings = new URLSearchParams(window.location.search).get('view') === 'settings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isSettings ? <SettingsApp /> : <App />}</StrictMode>,
)
