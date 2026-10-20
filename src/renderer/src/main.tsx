import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const params = new URLSearchParams(window.location.search)
const view = params.get('view')
const theme = params.get('theme')
if (theme) document.documentElement.dataset.theme = theme

const View =
  view === 'settings'
    ? (await import('./settings/SettingsApp')).SettingsApp
    : view === 'tooltip'
      ? (await import('./TooltipApp')).TooltipApp
      : view === 'top-bar'
        ? (await import('./topBar/TopBarApp')).TopBarApp
        : (await import('./App')).App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <View />
  </StrictMode>,
)
