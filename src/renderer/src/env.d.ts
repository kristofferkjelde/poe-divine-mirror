/// <reference types="vite/client" />

import type { OverlayBridge, SettingsApi } from '../../shared/ipc'

declare module 'react' {
  interface CSSProperties {
    '--fill'?: string
  }
}

declare global {
  interface Window {
    overlay: OverlayBridge
    settings: SettingsApi
  }
}
