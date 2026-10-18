import './stub'
import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { DEFAULT_SETTINGS } from '../../../shared/settings'
import { Panel } from '../components/Panel'
import '../styles.css'
import * as Takes from './AnyTakes'
import { HOVERED as ITEMS } from './catalog'
import { PrototypeSwitcher, useVariant } from './PrototypeSwitcher'
import './prototype.css'

const VARIANTS = { A: Takes.nameA, B: Takes.nameB, C: Takes.nameC }
const COMPONENTS = { A: Takes.VariantA, B: Takes.VariantB, C: Takes.VariantC }
const THEMES = ['ember', 'mana', 'iron'] as const

let itemKey = 'gem'
let theme: (typeof THEMES)[number] = 'ember'
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const set = (change: () => void) => {
  change()
  document.documentElement.dataset.appTheme = theme
  listeners.forEach((listener) => listener())
}

function Prototype() {
  const variant = useVariant(Object.keys(VARIANTS)) as keyof typeof COMPONENTS
  const key = useSyncExternalStore(subscribe, () => itemKey)
  const currentTheme = useSyncExternalStore(subscribe, () => theme)
  const Variant = COMPONENTS[variant]
  const item = ITEMS[key]
  return (
    <>
      <div className="prototype-stage">
        <Panel key={variant} hotkeys={DEFAULT_SETTINGS.hotkeys} locked={false}>
          <Variant key={key} item={item} />
        </Panel>
      </div>
      <PrototypeSwitcher variants={VARIANTS} current={variant}>
        <select value={key} onChange={(event) => set(() => (itemKey = event.target.value))} aria-label="Hovered currency">
          {Object.entries(ITEMS).map(([id, held]) => (
            <option key={id} value={id}>
              {held.currency.name}
            </option>
          ))}
        </select>
        <select
          value={currentTheme}
          onChange={(event) => set(() => (theme = event.target.value as typeof theme))}
          aria-label="Theme"
        >
          {THEMES.map((name) => (
            <option key={name} value={name}>
              {name[0].toUpperCase() + name.slice(1)}
            </option>
          ))}
        </select>
      </PrototypeSwitcher>
    </>
  )
}

document.documentElement.dataset.appTheme = theme
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Prototype />
  </StrictMode>,
)
