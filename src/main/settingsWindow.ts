import { BrowserWindow } from 'electron'
import { THEME_BACKGROUNDS } from '../shared/settings'
import { SETTINGS_ARGUMENT, SETTINGS_CHANGED_CHANNEL, type SettingsApi } from '../shared/ipc'
import type { Hotkeys } from './hotkeys'
import { registerHandlers, type Handlers } from './ipc'
import type { SettingsStore } from './settingsStore'
import { ICON_PATH, loadRenderer, PRELOAD_PATH } from './renderer'

export class SettingsWindow {
  private window: BrowserWindow | null = null

  constructor(
    private readonly hotkeys: Hotkeys,
    private readonly store: SettingsStore,
    private readonly handlers: Handlers<SettingsApi>,
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

  changed(): void {
    this.window?.webContents.send(SETTINGS_CHANGED_CHANNEL)
  }

  open(): void {
    if (this.window) {
      this.bringToFront(this.window)
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
      webPreferences: { preload: PRELOAD_PATH, sandbox: true, zoomFactor: this.scale, additionalArguments: [SETTINGS_ARGUMENT] },
    })
    this.window.setAlwaysOnTop(true, 'screen-saver')
    this.window.once('ready-to-show', () => this.window && this.bringToFront(this.window))
    registerHandlers<SettingsApi>(this.window.webContents.ipc, 'settings', this.handlers)
    this.window.on('closed', () => {
      this.window = null
      this.hotkeys.resume()
    })
    void loadRenderer(this.window, this.store.current.theme, 'settings')
  }

  private bringToFront(window: BrowserWindow): void {
    window.show()
    window.moveTop()
    window.focus()
  }
}
