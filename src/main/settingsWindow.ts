import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import type { HotkeyAction } from '../shared/settings'
import type { Hotkeys } from './hotkeys'
import { loadRenderer, PRELOAD_PATH } from './renderer'

const ACTIONS = new Set<HotkeyAction>(['compare', 'equip'])

export class SettingsWindow {
  private window: BrowserWindow | null = null

  constructor(private readonly hotkeys: Hotkeys) {
    ipcMain.handle(IPC.settingsGet, () => hotkeys.state)
    ipcMain.handle(IPC.settingsReset, () => hotkeys.reset())
    ipcMain.handle(IPC.settingsSetHotkey, (_event, action: unknown, accelerator: unknown) => {
      if (!ACTIONS.has(action as HotkeyAction) || typeof accelerator !== 'string') {
        return { ok: false, error: 'Invalid hotkey' }
      }
      return hotkeys.set(action as HotkeyAction, accelerator)
    })
    ipcMain.on(IPC.settingsRecording, (_event, recording: unknown) => {
      if (recording === true) hotkeys.suspend()
      else hotkeys.resume()
    })
    ipcMain.on(IPC.settingsOpen, () => this.open())
  }

  open(): void {
    if (this.window) {
      this.window.show()
      this.window.focus()
      return
    }

    this.window = new BrowserWindow({
      width: 460,
      height: 400,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      autoHideMenuBar: true,
      title: 'PoE Item Checker Settings',
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
