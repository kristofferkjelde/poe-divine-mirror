/// <reference types="vite/client" />

import type { OverlayBridge, SettingsBridge, TooltipBridge, TopBarBridge } from '../../shared/ipc'

declare module 'react' {
  interface CSSProperties {
    '--fill'?: string
  }
}

declare global {
  interface Window {
    overlay: OverlayBridge
    settings: SettingsBridge
    tooltip: TooltipBridge
    topBar: TopBarBridge
  }
}
