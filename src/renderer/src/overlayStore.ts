import { useSyncExternalStore } from 'react'
import { rulesForProfile, type BuildProfile } from '../../shared/build/profile'
import { compareWithGear, parseGear, type GearComparison } from '../../shared/compare/gear'
import type { GearSlot } from '../../shared/gear'
import { ItemParseError, parseItem } from '../../shared/item/parse'
import type { ParsedItem } from '../../shared/item/types'
import type { CapturedItem } from '../../shared/ipc'
import type { Settings } from '../../shared/settings'
import type { PriceCheckResult } from '../../shared/trade/price'
import { withScale, type ItemSearch, type SearchFilter } from '../../shared/trade/query'

export type EvaluateState =
  | { status: 'closed' }
  | { status: 'preparing' }
  | { status: 'unavailable'; error: string }
  | { status: 'ready'; search: ItemSearch; searching: boolean; result: PriceCheckResult | null }

export type OverlayState =
  | { status: 'idle' }
  | {
      status: 'item'
      text: string
      item: ParsedItem
      evaluate: EvaluateState
      comparison: GearComparison | null
      buildComparison: GearComparison | null
      equippedTo?: GearSlot
      build: BuildProfile | null
      hotkeys: Settings['hotkeys']
      locked: boolean
      capturedAt: number
    }
  | { status: 'error'; message: string; hotkeys: Settings['hotkeys']; locked: boolean; capturedAt: number }

let state: OverlayState = { status: 'idle' }
const listeners = new Set<() => void>()

function toState({ text, capturedAt, gear, equippedTo, hotkeys, locked, build }: CapturedItem): OverlayState {
  try {
    const item = parseItem(text)
    const rules = rulesForProfile(build)
    const comparison = equippedTo ? null : compareWithGear(item, parseGear(gear), rules)
    const buildComparison = equippedTo || !build?.items ? null : compareWithGear(item, build.items, rules)
    const evaluate: EvaluateState = { status: 'closed' }
    return { status: 'item', text, item, evaluate, comparison, buildComparison, equippedTo, build, hotkeys, locked, capturedAt }
  } catch (error) {
    const message = error instanceof ItemParseError ? error.message : 'Could not read that item'
    return { status: 'error', message, hotkeys, locked, capturedAt }
  }
}

function setState(next: OverlayState) {
  state = next
  listeners.forEach((listener) => listener())
}

window.overlay.onItemCaptured((captured) => {
  setState(toState(captured))
  if (captured.priceCheck) void openEvaluate()
})

function setEvaluate(capturedAt: number, update: (evaluate: EvaluateState) => EvaluateState) {
  if (state.status !== 'item' || state.capturedAt !== capturedAt) return
  setState({ ...state, evaluate: update(state.evaluate) })
}

function editSearch(update: (search: ItemSearch) => ItemSearch) {
  if (state.status !== 'item') return
  setEvaluate(state.capturedAt, (evaluate) =>
    evaluate.status === 'ready' ? { ...evaluate, search: update(evaluate.search) } : evaluate,
  )
}

export async function openEvaluate(): Promise<void> {
  if (state.status !== 'item' || state.evaluate.status !== 'closed') return
  const { capturedAt, text } = state
  setEvaluate(capturedAt, () => ({ status: 'preparing' }))
  const prepared = await window.overlay.prepareSearch(text)
  setEvaluate(capturedAt, () =>
    prepared.ok
      ? { status: 'ready', search: prepared.search, searching: false, result: null }
      : { status: 'unavailable', error: prepared.error },
  )
  if (prepared.ok) await runSearch()
}

export function closeEvaluate(): void {
  if (state.status === 'item') setEvaluate(state.capturedAt, () => ({ status: 'closed' }))
}

export function updateFilter(key: string, patch: Partial<Pick<SearchFilter, 'enabled' | 'min' | 'max'>>): void {
  editSearch((search) => ({
    ...search,
    filters: search.filters.map((filter) => (filter.key === key ? { ...filter, ...patch } : filter)),
  }))
}

export function updateSearch(patch: Partial<Pick<ItemSearch, 'rarity' | 'corrupted' | 'status' | 'listed' | 'currency'>>): void {
  editSearch((search) => ({ ...search, ...patch }))
}

export function setSearchScale(scale: number): void {
  editSearch((search) => withScale(search, scale))
}

export async function runSearch(): Promise<void> {
  if (state.status !== 'item' || state.evaluate.status !== 'ready' || state.evaluate.searching) return
  const { capturedAt } = state
  const { search } = state.evaluate
  setEvaluate(capturedAt, (evaluate) => (evaluate.status === 'ready' ? { ...evaluate, searching: true } : evaluate))
  const result = await window.overlay.runSearch(search)
  setEvaluate(capturedAt, (evaluate) =>
    evaluate.status === 'ready' ? { ...evaluate, searching: false, result } : evaluate,
  )
}

export async function forgetGear(slot: GearSlot): Promise<void> {
  await window.overlay.forgetGear(slot)
  if (state.status === 'item' && state.comparison?.slot === slot) setState({ ...state, comparison: null })
}

export async function setOverlayLocked(locked: boolean): Promise<void> {
  if (state.status !== 'idle') setState({ ...state, locked })
  await window.overlay.setLocked(locked)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOverlayState(): OverlayState {
  return useSyncExternalStore(subscribe, () => state)
}
