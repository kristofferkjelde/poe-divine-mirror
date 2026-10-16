/// <reference types="vite/client" />

import type { OverlayBridge, SettingsApi, TooltipBridge } from '../../shared/ipc'

declare module 'react' {
  interface CSSProperties {
    '--fill'?: string
  }
}

declare global {
  interface Window {
    overlay: OverlayBridge
    settings: SettingsApi
    tooltip: TooltipBridge
  }
}
