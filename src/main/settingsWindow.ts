import { BrowserWindow, ipcMain, net } from 'electron'
import { IPC, type SettingsResponse, type SettingsState } from '../shared/ipc'
import type { HotkeyAction } from '../shared/settings'
import { BuildImportError, importBuild } from './buildImport'
import type { BuildStore } from './buildStore'
import type { Hotkeys } from './hotkeys'
import { loadRenderer, PRELOAD_PATH } from './renderer'
import type { SettingsStore } from './settingsStore'

const ACTIONS = new Set<HotkeyAction>(['compare', 'equip'])

export class SettingsWindow {
  private window: BrowserWindow | null = null

  constructor(
    private readonly store: SettingsStore,
    private readonly hotkeys: Hotkeys,
    private readonly builds: BuildStore,
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
      async (_event, action: unknown, accelerator: unknown): Promise<SettingsResponse> => {
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

    ipcMain.handle(IPC.buildImport, async (_event, input: unknown): Promise<SettingsResponse> => {
      if (typeof input !== 'string' || input.trim() === '') return { ok: false, error: 'Paste a build code or link first' }
      try {
        await builds.set(await importBuild(input, download))
        return { ok: true, state: this.state }
      } catch (error) {
        if (error instanceof BuildImportError) return { ok: false, error: error.message }
        console.error('Build import failed', error)
        return { ok: false, error: 'Could not read that build' }
      }
    })
    ipcMain.handle(IPC.buildRemove, async () => {
      await builds.set(null)
      return this.state
    })
    ipcMain.handle(IPC.buildSetWeight, async (_event, stat: unknown, weight: unknown) => {
      const valid = weight === null || (typeof weight === 'number' && Number.isFinite(weight) && Math.abs(weight) <= 1000)
      if (typeof stat === 'string' && valid) await builds.setWeight(stat, weight as number | null)
      return this.state
    })
    ipcMain.handle(IPC.buildResetWeights, async () => {
      if (builds.current) await builds.set({ ...builds.current, custom: {} })
      return this.state
    })
  }

  private get state(): SettingsState {
    return { settings: this.store.current, unavailable: this.hotkeys.unavailableActions, build: this.builds.current }
  }

  open(): void {
    if (this.window) {
      this.window.show()
      this.window.focus()
      return
    }

    this.window = new BrowserWindow({
      width: 460,
      height: 720,
      minHeight: 480,
      resizable: true,
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

const DOWNLOAD_TIMEOUT_MS = 15_000

async function download(url: string): Promise<string> {
  const response = await net.fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}
