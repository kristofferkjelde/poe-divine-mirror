import { useSyncExternalStore, type ReactNode } from 'react'

let current = new URLSearchParams(window.location.search).get('variant')
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useVariant(keys: string[]): string {
  const value = useSyncExternalStore(subscribe, () => current)
  return value && keys.includes(value) ? value : keys[0]
}

function go(key: string) {
  current = key
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('variant', key)
    window.history.replaceState(null, '', url)
  } catch {}
  listeners.forEach((listener) => listener())
}

const editing = () => {
  const target = document.activeElement
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target as HTMLElement | null)?.isContentEditable
}

interface SwitcherProps {
  variants: Record<string, string>
  current: string
  children?: ReactNode
}

export function PrototypeSwitcher({ variants, current, children }: SwitcherProps) {
  const keys = Object.keys(variants)
  const step = (by: number) => go(keys[(keys.indexOf(current) + by + keys.length) % keys.length])
  const bindKeys = (node: HTMLElement | null) => {
    if (!node) return
    const onKey = (event: KeyboardEvent) => {
      if (editing()) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }

  return (
    <nav className="prototype-switcher" ref={bindKeys} aria-label="Prototype variants">
      <button type="button" onClick={() => step(-1)} aria-label="Previous variant">
        ←
      </button>
      <span>
        {current} ({variants[current]})
      </span>
      <button type="button" onClick={() => step(1)} aria-label="Next variant">
        →
      </button>
      {children}
    </nav>
  )
}
