import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const params = new URLSearchParams(window.location.search)
const isSettings = params.get('view') === 'settings'
const theme = params.get('theme')
if (theme) document.documentElement.dataset.theme = theme

const View = isSettings ? (await import('./settings/SettingsApp')).SettingsApp : (await import('./App')).App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <View />
  </StrictMode>,
)
