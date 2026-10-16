import { net, shell } from 'electron'
import { toResult } from '../shared/errors'
import { isGearSlot } from '../shared/gear'
import type { OverlayApi, SettingsApi, SettingsState } from '../shared/ipc'
import { isHotkeyAction, isTheme, isUiScale } from '../shared/settings'
import { TRADE_ORIGIN } from '../shared/trade/price'
import { chooseItemSet, importBuild } from './buildImport'
import type { BuildStore } from './buildStore'
import type { GearStore } from './gearStore'
import type { Hotkeys } from './hotkeys'
import type { Handlers } from './ipc'
import type { Overlay } from './overlay'
import type { SettingsStore } from './settingsStore'
import type { SettingsWindow } from './settingsWindow'
import type { TradeClient } from './trade'

const DOWNLOAD_TIMEOUT_MS = 15_000
const MAX_WEIGHT = 1000

interface Services {
  store: SettingsStore
  gear: GearStore
  builds: BuildStore
  hotkeys: Hotkeys
  trade: TradeClient
  overlay: Overlay
  settingsWindow: SettingsWindow
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function overlayHandlers({ store, gear, trade, overlay, settingsWindow }: Services): Handlers<OverlayApi> {
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
    prepareSearch: (text) =>
      typeof text === 'string' ? trade.prepare(text) : { ok: false, error: 'No item to price' },
    runSearch: (id, edit) =>
      typeof id === 'string' ? trade.search(id, edit, store.current.league) : { ok: false, error: 'Nothing to search for' },
    openTrade: (url) => {
      if (typeof url === 'string' && url.startsWith(`${TRADE_ORIGIN}/trade2/`)) void shell.openExternal(url)
    },
    startTyping: () => overlay.startTyping(),
    rendered: (height) => {
      if (isFiniteNumber(height)) overlay.rendered(height)
    },
    painted: () => overlay.painted(),
    startDrag: () => overlay.startDrag(),
    drag: () => overlay.drag(),
    endDrag: () => overlay.endDrag(),
  }
}

export function settingsHandlers({ store, builds, hotkeys, trade }: Services): Handlers<SettingsApi> {
  const state = (): SettingsState => ({
    settings: store.current,
    unavailable: hotkeys.unavailableActions,
    build: builds.current,
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
        await builds.set(await importBuild(input, download))
        return { ok: true, state: state() }
      } catch (error) {
        return toResult(error, 'Could not read that build')
      }
    },
    removeBuild: () => then(builds.set(null)),
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
      if (typeof stat === 'string' && valid) await builds.setWeight(stat, weight as number | null)
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
