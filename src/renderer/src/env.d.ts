/// <reference types="vite/client" />

import type { OverlayBridge, SettingsApi } from '../../shared/ipc'

declare global {
  interface Window {
    overlay: OverlayBridge
    settings: SettingsApi
  }
}
