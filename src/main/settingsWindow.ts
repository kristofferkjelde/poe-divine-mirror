import { BrowserWindow } from 'electron'
import type { Hotkeys } from './hotkeys'
import type { SettingsStore } from './settingsStore'
import { ICON_PATH, loadRenderer, PRELOAD_PATH } from './renderer'

export class SettingsWindow {
  private window: BrowserWindow | null = null

  constructor(
    private readonly hotkeys: Hotkeys,
    private readonly store: SettingsStore,
  ) {
    store.watch((settings) => settings.uiScale, () => this.window?.webContents.setZoomFactor(this.scale))
  }

  private get scale(): number {
    return this.store.current.uiScale / 100
  }

  open(): void {
    if (this.window) {
      this.window.show()
      this.window.focus()
      return
    }

    this.window = new BrowserWindow({
      width: 460,
      icon: ICON_PATH,
      height: 720,
      minHeight: 480,
      resizable: true,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      autoHideMenuBar: true,
      title: 'Divine Mirror Settings',
      backgroundColor: '#0b0907',
      webPreferences: { preload: PRELOAD_PATH, sandbox: true },
    })
    this.window.setMenu(null)
    this.window.on('closed', () => {
      this.window = null
      this.hotkeys.resume()
    })
    this.window.webContents.on('did-finish-load', () => this.window?.webContents.setZoomFactor(this.scale))
    void loadRenderer(this.window, 'settings')
  }
}
