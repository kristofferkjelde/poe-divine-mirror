/// <reference types="vite/client" />

import type { OverlayApi, SettingsApi } from '../../shared/ipc'

declare global {
  interface Window {
    overlay: OverlayApi
    settings: SettingsApi
  }
}
