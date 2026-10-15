import type { Gear, GearSlot } from './gear'
import type { HotkeyAction, Settings } from './settings'

export const IPC = {
  itemCaptured: 'item:captured',
  overlayResize: 'overlay:resize',
  overlayHide: 'overlay:hide',
  settingsGet: 'settings:get',
  settingsSetHotkey: 'settings:set-hotkey',
  settingsReset: 'settings:reset',
  settingsRecording: 'settings:recording',
  settingsOpen: 'settings:open',
} as const

export interface CapturedItem {
  text: string
  capturedAt: number
  gear: Gear
  hotkeys: Settings['hotkeys']
  equippedTo?: GearSlot
}

export interface SettingsState {
  settings: Settings
  unavailable: HotkeyAction[]
}

export type SetHotkeyResult = { ok: true; state: SettingsState } | { ok: false; error: string }

export interface OverlayApi {
  onItemCaptured: (listener: (item: CapturedItem) => void) => () => void
  resize: (height: number) => void
  hide: () => void
  openSettings: () => void
}

export interface SettingsApi {
  get: () => Promise<SettingsState>
  setHotkey: (action: HotkeyAction, accelerator: string) => Promise<SetHotkeyResult>
  reset: () => Promise<SettingsState>
  setRecording: (recording: boolean) => void
}
