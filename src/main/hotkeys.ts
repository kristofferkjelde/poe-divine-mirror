import { globalShortcut } from 'electron'
import type { SetHotkeyResult } from '../shared/ipc'
import { DEFAULT_SETTINGS, HOTKEY_ACTIONS, type HotkeyAction, type Settings } from '../shared/settings'
import type { SettingsStore } from './settingsStore'

type Handlers = Record<HotkeyAction, () => void>

export class Hotkeys {
  private unavailable: HotkeyAction[] = []

  constructor(
    private readonly store: SettingsStore,
    private readonly handlers: Handlers,
  ) {
    this.unavailable = this.register(store.current.hotkeys)
  }

  get unavailableActions(): HotkeyAction[] {
    return [...this.unavailable]
  }

  async set(action: HotkeyAction, accelerator: string): Promise<SetHotkeyResult> {
    const previous = this.store.current.hotkeys
    const other = HOTKEY_ACTIONS.find(
      (key) => key !== action && previous[key].toLowerCase() === accelerator.toLowerCase(),
    )
    if (other) return { ok: false, error: `${accelerator} is already used by the other hotkey` }

    const next = { ...previous, [action]: accelerator }
    const unavailable = this.register(next)
    if (unavailable.includes(action)) {
      this.unavailable = this.register(previous)
      return { ok: false, error: `${accelerator} is taken by another app. Pick a different combination.` }
    }

    this.unavailable = unavailable
    await this.store.update({ hotkeys: next })
    return { ok: true }
  }

  async reset(): Promise<void> {
    this.unavailable = this.register(DEFAULT_SETTINGS.hotkeys)
    await this.store.update({ hotkeys: { ...DEFAULT_SETTINGS.hotkeys } })
  }

  suspend(): void {
    globalShortcut.unregisterAll()
  }

  resume(): void {
    this.unavailable = this.register(this.store.current.hotkeys)
  }

  private register(hotkeys: Settings['hotkeys']): HotkeyAction[] {
    globalShortcut.unregisterAll()
    return HOTKEY_ACTIONS.filter((action) => {
      try {
        return !globalShortcut.register(hotkeys[action], this.handlers[action])
      } catch {
        return true
      }
    })
  }
}
