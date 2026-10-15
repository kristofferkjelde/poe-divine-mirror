import type { BrowserWindow } from 'electron'
import { join } from 'node:path'

export const PRELOAD_PATH = join(__dirname, '../preload/index.js')

export function loadRenderer(window: BrowserWindow, view?: 'settings'): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL)
    if (view) url.searchParams.set('view', view)
    return window.loadURL(url.toString())
  }
  return window.loadFile(join(__dirname, '../renderer/index.html'), view ? { query: { view } } : undefined)
}
