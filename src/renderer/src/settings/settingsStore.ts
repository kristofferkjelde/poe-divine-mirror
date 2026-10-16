import { useSyncExternalStore } from 'react'
import type { SettingsState } from '../../../shared/ipc'

let state: SettingsState | null = null
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

export function setSettingsState(next: SettingsState): void {
  state = next
  document.documentElement.dataset.theme = next.settings.theme
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  loading ??= window.settings.get().then(setSettingsState)
  return () => listeners.delete(listener)
}

export function useSettingsState(): SettingsState | null {
  return useSyncExternalStore(subscribe, () => state)
}
