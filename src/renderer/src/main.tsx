import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { SettingsApp } from './settings/SettingsApp'
import './styles.css'

const params = new URLSearchParams(window.location.search)
const isSettings = params.get('view') === 'settings'
const theme = params.get('theme')
if (theme) document.documentElement.dataset.theme = theme

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isSettings ? <SettingsApp /> : <App />}</StrictMode>,
)
