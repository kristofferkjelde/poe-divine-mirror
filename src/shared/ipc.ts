import type { BuildProfile } from './build/profile'
import type { Gear, GearSlot } from './gear'
import type { HotkeyAction, Settings } from './settings'
import type { PriceCheckResult } from './trade/price'

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
  gearForget: 'gear:forget',
  buildImport: 'build:import',
  buildRemove: 'build:remove',
  buildSetWeight: 'build:set-weight',
  buildResetWeights: 'build:reset-weights',
  priceCheck: 'trade:price-check',
  openTrade: 'trade:open',
  tradeLeagues: 'trade:leagues',
  settingsSetLeague: 'settings:set-league',
} as const

export interface CapturedItem {
  text: string
  capturedAt: number
  gear: Gear
  hotkeys: Settings['hotkeys']
  locked: boolean
  build: BuildProfile | null
  equippedTo?: GearSlot
  priceCheck?: boolean
}

export interface SettingsState {
  settings: Settings
  unavailable: HotkeyAction[]
  build: BuildProfile | null
}

export type SetHotkeyResult = { ok: true } | { ok: false; error: string }
export type SettingsResponse = { ok: true; state: SettingsState } | { ok: false; error: string }

export interface OverlayApi {
  onItemCaptured: (listener: (item: CapturedItem) => void) => () => void
  resize: (height: number) => void
  hide: () => void
  openSettings: () => void
  setLocked: (locked: boolean) => Promise<void>
  forgetGear: (slot: GearSlot) => Promise<void>
  checkPrice: (text: string) => Promise<PriceCheckResult>
  openTrade: (url: string) => void
}

export interface SettingsApi {
  get: () => Promise<SettingsState>
  setHotkey: (action: HotkeyAction, accelerator: string) => Promise<SettingsResponse>
  reset: () => Promise<SettingsState>
  resetPosition: () => Promise<SettingsState>
  setLocked: (locked: boolean) => Promise<SettingsState>
  setRecording: (recording: boolean) => void
  importBuild: (input: string) => Promise<SettingsResponse>
  removeBuild: () => Promise<SettingsState>
  setBuildWeight: (stat: string, weight: number | null) => Promise<SettingsState>
  resetBuildWeights: () => Promise<SettingsState>
  listLeagues: () => Promise<string[]>
  setLeague: (league: string | null) => Promise<SettingsState>
}
