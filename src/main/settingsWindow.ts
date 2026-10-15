import { BrowserWindow, ipcMain } from 'electron'
import { IPC, type SetHotkeyResponse, type SettingsState } from '../shared/ipc'
import type { HotkeyAction } from '../shared/settings'
import type { Hotkeys } from './hotkeys'
import { loadRenderer, PRELOAD_PATH } from './renderer'
import type { SettingsStore } from './settingsStore'

const ACTIONS = new Set<HotkeyAction>(['compare', 'equip'])

export class SettingsWindow {
  private window: BrowserWindow | null = null

  constructor(
    private readonly store: SettingsStore,
    private readonly hotkeys: Hotkeys,
  ) {
    ipcMain.handle(IPC.settingsGet, () => this.state)
    ipcMain.handle(IPC.settingsReset, async () => {
      await hotkeys.reset()
      await store.update({ overlayPosition: null })
      return this.state
    })
    ipcMain.handle(IPC.overlaySetLocked, async (_event, locked: unknown) => {
      await store.update({ overlayLocked: locked === true })
      return this.state
    })
    ipcMain.handle(IPC.settingsResetPosition, async () => {
      await store.update({ overlayPosition: null })
      return this.state
    })
    ipcMain.handle(
      IPC.settingsSetHotkey,
      async (_event, action: unknown, accelerator: unknown): Promise<SetHotkeyResponse> => {
        if (!ACTIONS.has(action as HotkeyAction) || typeof accelerator !== 'string') {
          return { ok: false, error: 'Invalid hotkey' }
        }
        const result = await hotkeys.set(action as HotkeyAction, accelerator)
        return result.ok ? { ok: true, state: this.state } : result
      },
    )
    ipcMain.on(IPC.settingsRecording, (_event, recording: unknown) => {
      if (recording === true) hotkeys.suspend()
      else hotkeys.resume()
    })
    ipcMain.on(IPC.settingsOpen, () => this.open())
  }

  private get state(): SettingsState {
    return { settings: this.store.current, unavailable: this.hotkeys.unavailableActions }
  }

  open(): void {
    if (this.window) {
      this.window.show()
      this.window.focus()
      return
    }

    this.window = new BrowserWindow({
      width: 460,
      height: 580,
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
