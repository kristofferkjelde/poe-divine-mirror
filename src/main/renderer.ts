import type { BrowserWindow } from 'electron'
import { join } from 'node:path'
import type { Theme } from '../shared/settings'
import { APP_ORIGIN } from './appScheme'

export const PRELOAD_PATH = join(__dirname, '../preload/index.js')

export function loadRenderer(window: BrowserWindow, theme: Theme, view?: 'settings' | 'tooltip'): Promise<void> {
  const url = new URL(process.env.ELECTRON_RENDERER_URL || `${APP_ORIGIN}/index.html`)
  url.searchParams.set('theme', theme)
  if (view) url.searchParams.set('view', view)
  return window.loadURL(url.toString())
}

export const ICON_PATH = join(__dirname, '../../resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
