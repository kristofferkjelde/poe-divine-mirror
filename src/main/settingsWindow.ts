import { BrowserWindow } from 'electron'
import { THEME_BACKGROUNDS } from '../shared/settings'
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
    store.watch(
      (settings) => settings.theme,
      (theme) => this.window?.setBackgroundColor(THEME_BACKGROUNDS[theme]),
    )
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
      show: false,
      title: 'Divine Mirror Settings',
      backgroundColor: THEME_BACKGROUNDS[this.store.current.theme],
      webPreferences: { preload: PRELOAD_PATH, sandbox: true, zoomFactor: this.scale },
    })
    this.window.once('ready-to-show', () => this.window?.show())
    this.window.on('closed', () => {
      this.window = null
      this.hotkeys.resume()
    })
    void loadRenderer(this.window, this.store.current.theme, 'settings')
  }
}
