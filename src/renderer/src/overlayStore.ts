import { useSyncExternalStore } from 'react'
import { compareWithGear, parseGear, type GearComparison } from '../../shared/compare/gear'
import type { GearSlot } from '../../shared/gear'
import { ItemParseError, parseItem } from '../../shared/item/parse'
import type { ParsedItem } from '../../shared/item/types'
import type { CapturedItem } from '../../shared/ipc'

export type OverlayState =
  | { status: 'idle' }
  | {
      status: 'item'
      item: ParsedItem
      comparison: GearComparison | null
      equippedTo?: GearSlot
      capturedAt: number
    }
  | { status: 'error'; message: string; capturedAt: number }

let state: OverlayState = { status: 'idle' }
const listeners = new Set<() => void>()

function toState({ text, capturedAt, gear, equippedTo }: CapturedItem): OverlayState {
  try {
    const item = parseItem(text)
    const comparison = equippedTo ? null : compareWithGear(item, parseGear(gear))
    return { status: 'item', item, comparison, equippedTo, capturedAt }
  } catch (error) {
    const message = error instanceof ItemParseError ? error.message : 'Could not read that item'
    return { status: 'error', message, capturedAt }
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
