import type { BuildProfile } from './build/profile'
import type { ActiveCharacter, CharacterList } from './characters'
import type { Gear, GearSlot } from './gear'
import type { ParsedItem } from './item/types'
import type { HotkeyAction, Settings, Theme, UiScale } from './settings'
import type { PrepareResult, PriceCheckResult } from './trade/price'
import type { ExchangeGroup } from './trade/currency'
import type { CurrencyWorthResult, ExchangeTarget } from './trade/exchange'
import type { SearchEdit } from './trade/query'

export type OverlayEvent =
  | { kind: 'item'; text: string; mode: HotkeyAction; equippedTo?: GearSlot }
  | { kind: 'missed'; mode: HotkeyAction; overlayVisible: boolean }

export interface OverlayContext {
  gear: Gear
  hotkeys: Settings['hotkeys']
  locked: boolean
  build: BuildProfile | null
  character: ActiveCharacter
  theme: Theme
  currencyTarget: ExchangeTarget
  currencyFlipped: boolean
}

export interface OverlayMessages {
  event: OverlayEvent
  preferences: Pick<OverlayContext, 'hotkeys' | 'locked' | 'theme' | 'currencyTarget' | 'currencyFlipped'>
  gear: Pick<OverlayContext, 'gear' | 'build' | 'character'>
  revealed: null
}

export interface SettingsState {
  settings: Settings
  unavailable: HotkeyAction[]
  build: BuildProfile | null
  characters: CharacterList
}

export type SetHotkeyResult = { ok: true } | { ok: false; error: string }
export type SettingsResponse = { ok: true; state: SettingsState } | { ok: false; error: string }

export interface StageFileResult {
  file: string
  stage?: string
  items?: number
  error?: string
}

export type AddStagesResponse = { ok: true; state: SettingsState; report: StageFileResult[] } | { ok: false; error: string }

export interface OverlayApi {
  resize: (height: number) => Promise<void>
  hide: () => Promise<void>
  openSettings: () => Promise<void>
  setLocked: (locked: boolean) => Promise<void>
  forgetGear: (slot: GearSlot) => Promise<void>
  clearGear: () => Promise<void>
  cycleCharacter: (by: number) => Promise<void>
  prepareSearch: (text: string) => Promise<PrepareResult>
  runSearch: (id: string, edit: SearchEdit) => Promise<PriceCheckResult>
  currencyWorth: (text: string, target: ExchangeTarget) => Promise<CurrencyWorthResult>
  exchangeCatalog: () => Promise<ExchangeGroup[]>
  setCurrencyTarget: (target: ExchangeTarget) => Promise<void>
  setCurrencyFlipped: (flipped: boolean) => Promise<void>
  openTrade: (url: string) => Promise<void>
  ready: () => Promise<void>
  rendered: (height: number) => Promise<void>
  painted: () => Promise<void>
  startDrag: () => Promise<void>
  endDrag: () => Promise<void>
  showTooltip: (item: ParsedItem) => Promise<void>
  hideTooltip: () => Promise<void>
}

export interface TooltipApi {
  ready: () => Promise<void>
  rendered: (id: number, height: number) => Promise<void>
}

export interface TooltipContent {
  id: number
  item: ParsedItem
}

export interface TooltipBridge extends TooltipApi {
  onContent: (listener: (content: TooltipContent | null) => void) => () => void
}

export interface BuildFile {
  name: string
  data: Uint8Array
}

export interface SettingsApi {
  get: () => Promise<SettingsState>
  setHotkey: (action: HotkeyAction, accelerator: string) => Promise<SettingsResponse>
  reset: () => Promise<SettingsState>
  resetPosition: () => Promise<SettingsState>
  setLocked: (locked: boolean) => Promise<SettingsState>
  setRecording: (recording: boolean) => Promise<void>
  importBuild: (input: string) => Promise<SettingsResponse>
  addBuildStages: (files: BuildFile[]) => Promise<AddStagesResponse>
  removeBuild: () => Promise<SettingsState>
  addCharacter: (name: string) => Promise<SettingsState>
  renameCharacter: (id: string, name: string) => Promise<SettingsState>
  removeCharacter: (id: string) => Promise<SettingsState>
  selectCharacter: (id: string) => Promise<SettingsState>
  setBuildItemSet: (itemSet: string) => Promise<SettingsState>
  setBuildWeight: (stat: string, weight: number | null) => Promise<SettingsState>
  resetBuildWeights: () => Promise<SettingsState>
  listLeagues: () => Promise<string[]>
  setLeague: (league: string | null) => Promise<SettingsState>
  setTheme: (theme: Theme) => Promise<SettingsState>
  setUiScale: (scale: UiScale) => Promise<SettingsState>
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
  clearGear: true,
  cycleCharacter: true,
  prepareSearch: true,
  runSearch: true,
  currencyWorth: true,
  exchangeCatalog: true,
  setCurrencyTarget: true,
  setCurrencyFlipped: true,
  openTrade: true,
  ready: true,
  rendered: true,
  painted: true,
  startDrag: true,
  endDrag: true,
  showTooltip: true,
  hideTooltip: true,
}

const SETTINGS_METHODS: Record<keyof SettingsApi, true> = {
  get: true,
  setHotkey: true,
  reset: true,
  resetPosition: true,
  setLocked: true,
  setRecording: true,
  importBuild: true,
  addBuildStages: true,
  removeBuild: true,
  addCharacter: true,
  renameCharacter: true,
  removeCharacter: true,
  selectCharacter: true,
  setBuildItemSet: true,
  setBuildWeight: true,
  resetBuildWeights: true,
  listLeagues: true,
  setLeague: true,
  setTheme: true,
  setUiScale: true,
}

const TOOLTIP_METHODS: Record<keyof TooltipApi, true> = {
  ready: true,
  rendered: true,
}

export const API_METHODS = {
  overlay: Object.keys(OVERLAY_METHODS),
  settings: Object.keys(SETTINGS_METHODS),
  tooltip: Object.keys(TOOLTIP_METHODS),
}

export type ApiScope = keyof typeof API_METHODS

export const SETTINGS_ARGUMENT = '--divine-mirror-settings'
export const TOOLTIP_ARGUMENT = '--divine-mirror-tooltip'
export const TOOLTIP_CHANNEL = 'tooltip:content'

export const apiChannel = (scope: ApiScope, method: string) => `${scope}:${method}`
export const messageChannel = (name: keyof OverlayMessages) => `overlay:message:${name}`
