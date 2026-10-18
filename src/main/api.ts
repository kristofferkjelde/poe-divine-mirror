import { net, shell } from 'electron'
import { toResult } from '../shared/errors'
import { isGearSlot } from '../shared/gear'
import type { ParsedItem } from '../shared/item/types'
import type { BuildFile, OverlayApi, SettingsApi, SettingsState } from '../shared/ipc'
import { isHotkeyAction, isTheme, isUiScale } from '../shared/settings'
import { isExchangeTarget } from '../shared/trade/exchange'
import { TRADE_ORIGIN } from '../shared/trade/price'
import { addStages, chooseItemSet, importBuild, stagesFromFiles } from './buildImport'
import type { BuildStore } from './buildStore'
import type { CharacterStore } from './characterStore'
import type { GearStore } from './gearStore'
import type { Hotkeys } from './hotkeys'
import type { Handlers } from './ipc'
import type { Overlay } from './overlay'
import { readPageState } from './pageReader'
import type { SettingsStore } from './settingsStore'
import type { SettingsWindow } from './settingsWindow'
import { MARKET_PAGE, type MarketClient } from './market'
import type { TradeClient } from './trade'

const DOWNLOAD_TIMEOUT_MS = 15_000
const MAX_WEIGHT = 1000

interface Services {
  store: SettingsStore
  gear: GearStore
  builds: BuildStore
  characters: CharacterStore
  hotkeys: Hotkeys
  trade: TradeClient
  market: MarketClient
  overlay: Overlay
  settingsWindow: SettingsWindow
}

const MAX_BUILD_FILES = 20
const MAX_BUILD_FILE_BYTES = 10_000_000

const isBuildFiles = (value: unknown): value is BuildFile[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= MAX_BUILD_FILES &&
  value.every(
    (file: Partial<BuildFile> | null) =>
      typeof file?.name === 'string' && file.data instanceof Uint8Array && file.data.length <= MAX_BUILD_FILE_BYTES,
  )

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function overlayHandlers({ store, gear, characters, trade, market, overlay, settingsWindow }: Services): Handlers<OverlayApi> {
  return {
    resize: (height) => {
      if (isFiniteNumber(height)) overlay.resize(height)
    },
    hide: () => overlay.hide(),
    openSettings: () => settingsWindow.open(),
    setLocked: (locked) => store.update({ overlayLocked: locked === true }),
    forgetGear: async (slot) => {
      if (isGearSlot(slot)) await gear.forget(slot)
    },
    clearGear: () => gear.clear(),
    cycleCharacter: async (by) => {
      if (by === 1 || by === -1) await characters.cycle(by)
    },
    prepareSearch: (text) =>
      typeof text === 'string' ? trade.prepare(text) : { ok: false, error: 'No item to price' },
    runSearch: (id, edit) =>
      typeof id === 'string' ? trade.search(id, edit, store.current.league) : { ok: false, error: 'Nothing to search for' },
    currencyWorth: (text, target) =>
      typeof text === 'string' && isExchangeTarget(target)
        ? market.worth(text, target, store.current.league)
        : { ok: false, error: 'No currency to price' },
    exchangeCatalog: () => trade.catalog().catch(() => []),
    setCurrencyTarget: async (target) => {
      if (isExchangeTarget(target)) await store.update({ currencyTarget: target })
    },
    openTrade: (url) => {
      if (typeof url === 'string' && (url.startsWith(`${TRADE_ORIGIN}/trade2/`) || url === MARKET_PAGE)) void shell.openExternal(url)
    },
    rendered: (height) => {
      if (isFiniteNumber(height)) overlay.rendered(height)
    },
    ready: () => overlay.ready(),
    painted: () => overlay.painted(),
    startDrag: () => overlay.startDrag(),
    endDrag: () => overlay.endDrag(),
    showTooltip: (item) => {
      if (typeof item === 'object' && item !== null) overlay.showTooltip(item as ParsedItem)
    },
    hideTooltip: () => overlay.hideTooltip(),
  }
}

export function settingsHandlers({
  store,
  builds,
  characters,
  hotkeys,
  trade,
}: Pick<Services, 'store' | 'builds' | 'characters' | 'hotkeys' | 'trade'>): Handlers<SettingsApi> {
  const state = (): SettingsState => ({
    settings: store.current,
    unavailable: hotkeys.unavailableActions,
    build: builds.current,
    characters: characters.current,
  })
  const then = (change: Promise<void>) => change.then(state)

  return {
    get: state,
    setHotkey: async (action, accelerator) => {
      if (!isHotkeyAction(action) || typeof accelerator !== 'string') return { ok: false, error: 'Invalid hotkey' }
      const result = await hotkeys.set(action, accelerator)
      return result.ok ? { ok: true, state: state() } : result
    },
    reset: async () => {
      await hotkeys.reset()
      return then(store.update({ overlayPosition: null }))
    },
    resetPosition: () => then(store.update({ overlayPosition: null })),
    setLocked: (locked) => then(store.update({ overlayLocked: locked === true })),
    setRecording: (recording) => (recording === true ? hotkeys.suspend() : hotkeys.resume()),
    importBuild: async (input) => {
      if (typeof input !== 'string' || input.trim() === '') return { ok: false, error: 'Paste a build code or link first' }
      try {
        await builds.set(await importBuild(input, download, readPageState))
        return { ok: true, state: state() }
      } catch (error) {
        return toResult(error, 'Could not read that build')
      }
    },
    addBuildStages: async (files) => {
      if (!isBuildFiles(files)) return { ok: false, error: 'Choose one or more .build files or a zip of them' }
      try {
        await builds.set(addStages(builds.current, stagesFromFiles(files)))
        return { ok: true, state: state() }
      } catch (error) {
        return toResult(error, 'Could not read those .build files')
      }
    },
    removeBuild: () => then(builds.set(null)),
    addCharacter: (name) => then(characters.add(typeof name === 'string' ? name : '')),
    renameCharacter: (id, name) =>
      typeof id === 'string' && typeof name === 'string' ? then(characters.rename(id, name)) : Promise.resolve(state()),
    removeCharacter: (id) => (typeof id === 'string' ? then(characters.remove(id)) : Promise.resolve(state())),
    selectCharacter: (id) => (typeof id === 'string' ? then(characters.select(id)) : Promise.resolve(state())),
    setBuildItemSet: async (itemSet) => {
      if (typeof itemSet === 'string' && builds.current) {
        try {
          await builds.set(chooseItemSet(builds.current, itemSet))
        } catch (error) {
          console.error('Could not switch build stage', error)
        }
      }
      return state()
    },
    setBuildWeight: async (stat, weight) => {
      const valid = weight === null || (isFiniteNumber(weight) && Math.abs(weight) <= MAX_WEIGHT)
      if (typeof stat === 'string' && valid) await builds.setWeight(stat, weight)
      return state()
    },
    resetBuildWeights: async () => {
      if (builds.current) await builds.set({ ...builds.current, custom: {} })
      return state()
    },
    listLeagues: () => trade.listLeagues().catch(() => []),
    setLeague: (league) =>
      then(store.update({ league: typeof league === 'string' && league.trim() !== '' ? league : null })),
    setTheme: (theme) => (isTheme(theme) ? then(store.update({ theme })) : Promise.resolve(state())),
    setUiScale: (scale) => (isUiScale(scale) ? then(store.update({ uiScale: scale })) : Promise.resolve(state())),
  }
}

async function download(url: string): Promise<string> {
  const response = await net.fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}
