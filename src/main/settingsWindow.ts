import { BrowserWindow } from 'electron'
import type { Hotkeys } from './hotkeys'
import { ICON_PATH, loadRenderer, PRELOAD_PATH } from './renderer'

export class SettingsWindow {
  private window: BrowserWindow | null = null

  constructor(private readonly hotkeys: Hotkeys) {}

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
    void loadRenderer(this.window, 'settings')
  }
}
