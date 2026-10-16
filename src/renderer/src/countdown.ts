import { useSyncExternalStore } from 'react'

const TICK_MS = 250
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribeTick(listener: () => void) {
  listeners.add(listener)
  timer ??= setInterval(() => listeners.forEach((notify) => notify()), TICK_MS)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

const subscribeNever = () => () => {}

export const secondsUntil = (at: number | undefined, now = Date.now()): number =>
  at === undefined ? 0 : Math.max(0, Math.ceil((at - now) / 1000))

export function useCountdown(at: number | undefined): number {
  const ticking = secondsUntil(at) > 0
  return useSyncExternalStore(ticking ? subscribeTick : subscribeNever, () => secondsUntil(at))
}
