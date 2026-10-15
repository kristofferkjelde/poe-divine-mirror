import type { BuildProfile } from './build/profile'
import type { Gear, GearSlot } from './gear'
import type { HotkeyAction, Settings } from './settings'
import type { PrepareResult, PriceCheckResult } from './trade/price'
import type { SearchEdit } from './trade/query'

export type OverlayEvent =
  | { kind: 'item'; text: string; mode: HotkeyAction; equippedTo?: GearSlot }
  | { kind: 'missed'; mode: HotkeyAction; overlayVisible: boolean }

export interface OverlayContext {
  gear: Gear
  hotkeys: Settings['hotkeys']
  locked: boolean
  build: BuildProfile | null
}

export interface OverlayMessages {
  event: OverlayEvent
  context: OverlayContext
}

export interface SettingsState {
  settings: Settings
  unavailable: HotkeyAction[]
  build: BuildProfile | null
}

export type SetHotkeyResult = { ok: true } | { ok: false; error: string }
export type SettingsResponse = { ok: true; state: SettingsState } | { ok: false; error: string }

export interface OverlayApi {
  resize: (height: number) => Promise<void>
  hide: () => Promise<void>
  openSettings: () => Promise<void>
  setLocked: (locked: boolean) => Promise<void>
  forgetGear: (slot: GearSlot) => Promise<void>
  prepareSearch: (text: string) => Promise<PrepareResult>
  runSearch: (id: string, edit: SearchEdit) => Promise<PriceCheckResult>
  openTrade: (url: string) => Promise<void>
}

export interface SettingsApi {
  get: () => Promise<SettingsState>
  setHotkey: (action: HotkeyAction, accelerator: string) => Promise<SettingsResponse>
  reset: () => Promise<SettingsState>
  resetPosition: () => Promise<SettingsState>
  setLocked: (locked: boolean) => Promise<SettingsState>
  setRecording: (recording: boolean) => Promise<void>
  importBuild: (input: string) => Promise<SettingsResponse>
  removeBuild: () => Promise<SettingsState>
  setBuildWeight: (stat: string, weight: number | null) => Promise<SettingsState>
  resetBuildWeights: () => Promise<SettingsState>
  listLeagues: () => Promise<string[]>
  setLeague: (league: string | null) => Promise<SettingsState>
}

export interface OverlayBridge extends OverlayApi {
  on: <K extends keyof OverlayMessages>(name: K, listener: (payload: OverlayMessages[K]) => void) => () => void
}

const OVERLAY_METHODS: Record<keyof OverlayApi, true> = {
  resize: true,
  hide: true,
  openSettings: true,
  setLocked: true,
  forgetGear: true,
  prepareSearch: true,
  runSearch: true,
  openTrade: true,
}

const SETTINGS_METHODS: Record<keyof SettingsApi, true> = {
  get: true,
  setHotkey: true,
  reset: true,
  resetPosition: true,
  setLocked: true,
  setRecording: true,
  importBuild: true,
  removeBuild: true,
  setBuildWeight: true,
  resetBuildWeights: true,
  listLeagues: true,
  setLeague: true,
}

export const API_METHODS = {
  overlay: Object.keys(OVERLAY_METHODS),
  settings: Object.keys(SETTINGS_METHODS),
}

export type ApiScope = keyof typeof API_METHODS

export const apiChannel = (scope: ApiScope, method: string) => `${scope}:${method}`
export const messageChannel = (name: keyof OverlayMessages) => `overlay:message:${name}`
