import type { Gear, GearSlot } from './gear'
import type { HotkeyAction, Settings } from './settings'

export const IPC = {
  itemCaptured: 'item:captured',
  overlayResize: 'overlay:resize',
  overlayHide: 'overlay:hide',
  settingsGet: 'settings:get',
  settingsSetHotkey: 'settings:set-hotkey',
  settingsReset: 'settings:reset',
  settingsResetPosition: 'settings:reset-position',
  settingsRecording: 'settings:recording',
  settingsOpen: 'settings:open',
  overlaySetLocked: 'overlay:set-locked',
} as const

export interface CapturedItem {
  text: string
  capturedAt: number
  gear: Gear
  hotkeys: Settings['hotkeys']
  locked: boolean
  equippedTo?: GearSlot
}

export interface SettingsState {
  settings: Settings
  unavailable: HotkeyAction[]
}

export type SetHotkeyResult = { ok: true } | { ok: false; error: string }
export type SetHotkeyResponse = { ok: true; state: SettingsState } | { ok: false; error: string }

export interface OverlayApi {
  onItemCaptured: (listener: (item: CapturedItem) => void) => () => void
  resize: (height: number) => void
  hide: () => void
  openSettings: () => void
  setLocked: (locked: boolean) => Promise<void>
}

export interface SettingsApi {
  get: () => Promise<SettingsState>
  setHotkey: (action: HotkeyAction, accelerator: string) => Promise<SetHotkeyResponse>
  reset: () => Promise<SettingsState>
  resetPosition: () => Promise<SettingsState>
  setLocked: (locked: boolean) => Promise<SettingsState>
  setRecording: (recording: boolean) => void
}
