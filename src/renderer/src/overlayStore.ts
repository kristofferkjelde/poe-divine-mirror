import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { rulesForProfile } from '../../shared/build/profile'
import { compareWithGear, parseGear, type GearComparison } from '../../shared/compare/gear'
import { UserFacingError } from '../../shared/errors'
import type { GearSlot } from '../../shared/gear'
import type { OverlayContext, OverlayEvent } from '../../shared/ipc'
import { parseItem } from '../../shared/item/parse'
import type { ParsedItem } from '../../shared/item/types'
import { DEFAULT_SETTINGS } from '../../shared/settings'
import type { ExchangeGroup } from '../../shared/trade/currency'
import type { CurrencyWorthResult, ExchangeTarget } from '../../shared/trade/exchange'
import { isMarketType } from '../../shared/trade/market'
import type { PriceCheckResult } from '../../shared/trade/price'
import {
  toSearchEdit,
  withScale,
  type FilterEdit,
  type ItemSearch,
  type SearchOptions,
} from '../../shared/trade/query'

const ART_DECODE_LIMIT_MS = 100
const SAVE_TARGET_DELAY_MS = 800

const MISSED_ITEM = "Couldn't read an item. Hover it in the game and press the hotkey again."

export type EvaluateState =
  | { status: 'closed' }
  | { status: 'preparing' }
  | { status: 'unavailable'; error: string }
  | { status: 'ready'; id: string; search: ItemSearch; searching: boolean; result: PriceCheckResult | null }

export interface WorthState {
  target: ExchangeTarget
  loading: boolean
  result: CurrencyWorthResult | null
}

type View =
  | { status: 'idle' }
  | {
      status: 'item'
      id: number
      text: string
      item: ParsedItem
      equippedTo?: GearSlot
      evaluate: EvaluateState
      worth?: WorthState
    }
  | { status: 'error'; id: number; message: string }

interface Comparisons {
  comparison: GearComparison | null
  buildComparison: GearComparison | null
}

export type OverlayState = OverlayContext &
  (
    | { status: 'idle' }
    | (Extract<View, { status: 'item' }> & Comparisons)
    | Extract<View, { status: 'error' }>
  )

let context: OverlayContext = {
  gear: {},
  hotkeys: DEFAULT_SETTINGS.hotkeys,
  locked: false,
  build: null,
  theme: DEFAULT_SETTINGS.theme,
  currencyTarget: DEFAULT_SETTINGS.currencyTarget,
}
let view: View = { status: 'idle' }
let comparisons: Comparisons = { comparison: null, buildComparison: null }
let state: OverlayState = { ...context, ...view }
let nextId = 1
const listeners = new Set<() => void>()

function compare(): Comparisons {
  if (view.status !== 'item' || view.equippedTo) return { comparison: null, buildComparison: null }
  const rules = rulesForProfile(context.build)
  return {
    comparison: compareWithGear(view.item, parseGear(context.gear), rules),
    buildComparison: context.build ? compareWithGear(view.item, context.build.items, rules) : null,
  }
}

function render() {
  state = view.status === 'item' ? { ...context, ...view, ...comparisons } : { ...context, ...view }
  listeners.forEach((listener) => listener())
}

function setView(next: View) {
  const itemChanged = next.status === 'item' && (view.status !== 'item' || next.id !== view.id)
  view = next
  if (itemChanged) comparisons = compare()
  render()
}

function show(event: Extract<OverlayEvent, { kind: 'item' }>): View {
  const id = nextId++
  try {
    const item = parseItem(event.text)
    const worth = isExchangeItem(item) ? { target: context.currencyTarget, loading: true, result: null } : undefined
    return { status: 'item', id, text: event.text, item, equippedTo: event.equippedTo, evaluate: { status: 'closed' }, worth }
  } catch (error) {
    return { status: 'error', id, message: error instanceof UserFacingError ? error.message : 'Could not read that item' }
  }
}

window.overlay.on('preferences', (preferences) => {
  const targetChanged = preferences.currencyTarget !== context.currencyTarget
  context = { ...context, ...preferences }
  document.documentElement.dataset.theme = preferences.theme
  render()
  if (targetChanged) void loadWorth()
})

window.overlay.on('gear', (gear) => {
  context = { ...context, ...gear }
  comparisons = compare()
  render()
})

function handleEvent(event: OverlayEvent) {
  if (event.kind === 'item') {
    setView(show(event))
    if (view.status === 'item' && view.worth) void loadWorth()
    else if (event.mode === 'price') void openEvaluate()
  } else if (event.mode === 'price' && event.overlayVisible && view.status === 'item' && !view.worth) {
    void openEvaluate()
  } else {
    setView({ status: 'error', id: nextId++, message: MISSED_ITEM })
  }
}

async function reportRendered() {
  const panel = document.querySelector<HTMLElement>('.panel')
  const images = [...(panel?.querySelectorAll('img') ?? [])].map((image) => image.decode().catch(() => {}))
  await Promise.race([Promise.all(images), new Promise((resolve) => setTimeout(resolve, ART_DECODE_LIMIT_MS))])
  await window.overlay.rendered(document.querySelector<HTMLElement>('.panel')?.offsetHeight ?? 0)
}

window.overlay.on('event', (event) => {
  flushSync(() => handleEvent(event))
  void reportRendered()
})

window.overlay.on('revealed', () => {
  requestAnimationFrame(() => requestAnimationFrame(() => void window.overlay.painted()))
})

function setEvaluate(id: number, update: (evaluate: EvaluateState) => EvaluateState) {
  if (view.status !== 'item' || view.id !== id) return
  setView({ ...view, evaluate: update(view.evaluate) })
}

function editSearch(update: (search: ItemSearch) => ItemSearch) {
  if (view.status !== 'item') return
  setEvaluate(view.id, (evaluate) => (evaluate.status === 'ready' ? { ...evaluate, search: update(evaluate.search) } : evaluate))
}

export const isExchangeItem = (item: ParsedItem) => item.rarity === 'Currency' || item.rarity === 'Gem'

async function loadWorth(again = false): Promise<void> {
  if (view.status !== 'item' || !view.worth) return
  const { id, text } = view
  const target = context.currencyTarget
  if (!again && !view.worth.loading && view.worth.target === target && view.worth.result) return
  setView({ ...view, worth: { ...view.worth, target, loading: true } })
  const result = await window.overlay.currencyWorth(text, target)
  if (view.status !== 'item' || view.id !== id || view.worth?.target !== target) return
  setView({ ...view, worth: { target, loading: false, result } })
}

export const retryWorth = (): Promise<void> => loadWorth(true)

let saveTarget: ReturnType<typeof setTimeout> | undefined

export function showWorthIn(target: ExchangeTarget): void {
  if (target === context.currencyTarget) return
  context = { ...context, currencyTarget: target }
  render()
  void loadWorth()
  clearTimeout(saveTarget)
  saveTarget = setTimeout(() => void window.overlay.setCurrencyTarget(target), SAVE_TARGET_DELAY_MS)
}

let catalog: Promise<ExchangeGroup[]> | null = null

export const exchangeCatalog = (): Promise<ExchangeGroup[]> =>
  (catalog ??= window.overlay.exchangeCatalog().then((groups) => {
    if (groups.length === 0) catalog = null
    return groups.filter((group) => isMarketType(group.id))
  }))

export async function openEvaluate(): Promise<void> {
  if (view.status !== 'item' || view.evaluate.status !== 'closed' || view.worth) return
  const { id, text } = view
  setEvaluate(id, () => ({ status: 'preparing' }))
  const prepared = await window.overlay.prepareSearch(text)
  setEvaluate(id, () =>
    prepared.ok
      ? { status: 'ready', id: prepared.id, search: prepared.search, searching: false, result: null }
      : { status: 'unavailable', error: prepared.error },
  )
  if (prepared.ok) await runSearch()
}

export function closeEvaluate(): void {
  if (view.status === 'item') setEvaluate(view.id, () => ({ status: 'closed' }))
}

export function updateFilter(key: string, patch: Partial<FilterEdit>): void {
  editSearch((search) => ({
    ...search,
    filters: search.filters.map((filter) => (filter.key === key ? { ...filter, ...patch } : filter)),
  }))
}

export function updateSearch(patch: Partial<SearchOptions>): void {
  editSearch((search) => ({ ...search, ...patch }))
}

export function setSearchScale(scale: number): void {
  editSearch((search) => withScale(search, scale))
}

export async function runSearch(): Promise<void> {
  if (view.status !== 'item' || view.evaluate.status !== 'ready' || view.evaluate.searching) return
  const { id } = view
  const { id: searchId, search } = view.evaluate
  setEvaluate(id, (evaluate) => (evaluate.status === 'ready' ? { ...evaluate, searching: true } : evaluate))
  const result = await window.overlay.runSearch(searchId, toSearchEdit(search))
  setEvaluate(id, (evaluate) => (evaluate.status === 'ready' ? { ...evaluate, searching: false, result } : evaluate))
}

export const forgetGear = (slot: GearSlot): Promise<void> => window.overlay.forgetGear(slot)

export async function setOverlayLocked(locked: boolean): Promise<void> {
  context = { ...context, locked }
  render()
  await window.overlay.setLocked(locked)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOverlayState(): OverlayState {
  return useSyncExternalStore(subscribe, () => state)
}

void window.overlay.ready()
