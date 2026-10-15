/// <reference types="vite/client" />

import type { OverlayApi } from '../../shared/ipc'

declare global {
  interface Window {
    overlay: OverlayApi
  }
}
