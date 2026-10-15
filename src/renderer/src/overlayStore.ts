import { useSyncExternalStore } from 'react'
import { rulesForProfile, type BuildProfile } from '../../shared/build/profile'
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
    return { status: 'item', item, comparison, buildComparison, equippedTo, build, hotkeys, locked, capturedAt }
  } catch (error) {
    const message = error instanceof ItemParseError ? error.message : 'Could not read that item'
    return { status: 'error', message, hotkeys, locked, capturedAt }
  }
}

function setState(next: OverlayState) {
  state = next
  listeners.forEach((listener) => listener())
}

window.overlay.onItemCaptured((captured) => setState(toState(captured)))

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
