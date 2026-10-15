import { useSyncExternalStore } from 'react'
import { compareWithGear, parseGear, type GearComparison } from '../../shared/compare/gear'
import type { GearSlot } from '../../shared/gear'
import { ItemParseError, parseItem } from '../../shared/item/parse'
import type { ParsedItem } from '../../shared/item/types'
import type { CapturedItem } from '../../shared/ipc'
import type { Settings } from '../../shared/settings'

export type OverlayState =
  | { status: 'idle' }
  | {
      status: 'item'
      item: ParsedItem
      comparison: GearComparison | null
      equippedTo?: GearSlot
      hotkeys: Settings['hotkeys']
      capturedAt: number
    }
  | { status: 'error'; message: string; hotkeys: Settings['hotkeys']; capturedAt: number }

let state: OverlayState = { status: 'idle' }
const listeners = new Set<() => void>()

function toState({ text, capturedAt, gear, equippedTo, hotkeys }: CapturedItem): OverlayState {
  try {
    const item = parseItem(text)
    const comparison = equippedTo ? null : compareWithGear(item, parseGear(gear))
    return { status: 'item', item, comparison, equippedTo, hotkeys, capturedAt }
  } catch (error) {
    const message = error instanceof ItemParseError ? error.message : 'Could not read that item'
    return { status: 'error', message, hotkeys, capturedAt }
  }
}

window.overlay.onItemCaptured((captured) => {
  state = toState(captured)
  listeners.forEach((listener) => listener())
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOverlayState(): OverlayState {
  return useSyncExternalStore(subscribe, () => state)
}
