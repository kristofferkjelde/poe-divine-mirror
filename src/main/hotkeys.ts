import { globalShortcut } from 'electron'
import type { SetHotkeyResult, SettingsState } from '../shared/ipc'
import { DEFAULT_SETTINGS, normalizeSettings, type HotkeyAction, type Settings } from '../shared/settings'
import { jsonFile } from './jsonFile'

type Handlers = Record<HotkeyAction, () => void>

export class Hotkeys {
  private readonly file = jsonFile('settings.json')
  private settings: Settings = normalizeSettings(this.file.read())
  private unavailable: HotkeyAction[] = []
  private readonly listeners = new Set<() => void>()

  constructor(private readonly handlers: Handlers) {
    this.unavailable = this.register(this.settings.hotkeys)
  }

  get state(): SettingsState {
    return { settings: this.settings, unavailable: [...this.unavailable] }
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener)
  }

  get current(): Settings['hotkeys'] {
    return { ...this.settings.hotkeys }
  }

  async set(action: HotkeyAction, accelerator: string): Promise<SetHotkeyResult> {
    const previous = this.settings.hotkeys
    const other = (Object.keys(previous) as HotkeyAction[]).find(
      (key) => key !== action && previous[key].toLowerCase() === accelerator.toLowerCase(),
    )
    if (other) return { ok: false, error: `${accelerator} is already used by the other hotkey` }

    const next = { ...previous, [action]: accelerator }
    const unavailable = this.register(next)
    if (unavailable.includes(action)) {
      this.unavailable = this.register(previous)
      return { ok: false, error: `${accelerator} is taken by another app. Pick a different combination.` }
    }

    this.settings = { ...this.settings, hotkeys: next }
    this.unavailable = unavailable
    await this.file.write(this.settings)
    this.notify()
    return { ok: true, state: this.state }
  }

  async reset(): Promise<SettingsState> {
    this.settings = structuredClone(DEFAULT_SETTINGS)
    this.unavailable = this.register(this.settings.hotkeys)
    await this.file.write(this.settings)
    this.notify()
    return this.state
  }

  suspend(): void {
    globalShortcut.unregisterAll()
  }

  resume(): void {
    this.unavailable = this.register(this.settings.hotkeys)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  private register(hotkeys: Settings['hotkeys']): HotkeyAction[] {
    globalShortcut.unregisterAll()
    return (Object.keys(hotkeys) as HotkeyAction[]).filter((action) => {
      try {
        return !globalShortcut.register(hotkeys[action], this.handlers[action])
      } catch {
        return true
      }
    })
  }
}
