import { useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from 'react'
import { characterLabel } from '../../../shared/characters'
import type { TopBarState } from '../../../shared/ipc'
import { THEME_LABELS, THEMES } from '../../../shared/settings'
import appIcon from '../../../../resources/icon.svg'
import { Icon } from './icons'

const DRAG_THRESHOLD = 4
const QUIT_CONFIRM_MS = 3000

let state: TopBarState | null = null
const listeners = new Set<() => void>()

window.topBar.onState((next) => {
  state = next
  document.documentElement.dataset.theme = next.theme
  listeners.forEach((listener) => listener())
})
void window.topBar.ready()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const reportSize = (node: HTMLElement | null) => {
  if (!node) return
  const observer = new ResizeObserver(() => void window.topBar.rendered(node.offsetWidth, node.offsetHeight))
  observer.observe(node)
  return () => observer.disconnect()
}

export function TopBarApp() {
  const current = useSyncExternalStore(subscribe, () => state)
  return current && <StripBar state={current} />
}

function useWindowDrag() {
  const drag = useRef<{ x: number; y: number; moving: boolean } | null>(null)
  const end = () => {
    if (drag.current?.moving) void window.topBar.endDrag()
    drag.current = null
  }
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return
      drag.current = { x: event.clientX, y: event.clientY, moving: false }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current
      if (!current || current.moving) return
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_THRESHOLD) return
      current.moving = true
      event.currentTarget.setPointerCapture(event.pointerId)
      void window.topBar.startDrag()
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
  }
}

interface ButtonProps {
  label: string
  onClick: () => void
  children: ReactNode
  pressed?: boolean
  danger?: boolean
  armed?: boolean
}

function BarButton({ label, onClick, children, pressed, danger, armed }: ButtonProps) {
  return (
    <button
      type="button"
      className="top-bar-button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      data-danger={danger || undefined}
      data-armed={armed || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function StripBar({ state }: { state: TopBarState }) {
  const { theme, locked, characters } = state
  const [quitArmed, setQuitArmed] = useState(false)
  const disarm = useRef<number | undefined>(undefined)
  const drag = useWindowDrag()
  const index = characters.characters.findIndex((character) => character.id === characters.active)
  const next = characters.characters[(index + 1) % characters.characters.length]

  const quit = () => {
    window.clearTimeout(disarm.current)
    if (quitArmed) {
      void window.topBar.quit()
      return
    }
    setQuitArmed(true)
    disarm.current = window.setTimeout(() => setQuitArmed(false), QUIT_CONFIRM_MS)
  }

  return (
    <div ref={reportSize} className="top-bar" title="Drag to move the bar" {...drag}>
      <span className="top-bar-grip">
        <img src={appIcon} alt="Divine Mirror" draggable={false} />
      </span>
      <span className="top-bar-divider" />
      <BarButton
        label={characters.characters.length > 1 ? `Switch to ${characterLabel(characters, next.id)}` : 'Add characters in Settings'}
        onClick={() => void (characters.characters.length > 1 ? window.topBar.selectCharacter(next.id) : window.topBar.openSettings())}
      >
        <Icon name="user" />
        <span className="top-bar-character">{characterLabel(characters, characters.active)}</span>
      </BarButton>
      <span className="top-bar-divider" />
      <span className="top-bar-swatches" role="group" aria-label="Theme">
        {THEMES.map((name) => (
          <button
            key={name}
            type="button"
            className="top-bar-swatch"
            data-swatch={name}
            aria-pressed={name === theme}
            title={`${THEME_LABELS[name].name} theme`}
            aria-label={`${THEME_LABELS[name].name} theme`}
            onClick={() => void window.topBar.setTheme(name)}
          />
        ))}
      </span>
      <span className="top-bar-divider" />
      <BarButton label={locked ? 'Unlock the popup so you can move it' : 'Lock the popup where it is'} pressed={locked} onClick={() => void window.topBar.setLocked(!locked)}>
        <Icon name={locked ? 'locked' : 'unlocked'} />
      </BarButton>
      <BarButton label="Settings" onClick={() => void window.topBar.openSettings()}>
        <Icon name="gear" />
      </BarButton>
      <BarButton label="Hide the bar (turn it back on in Settings or the tray menu)" onClick={() => void window.topBar.hide()}>
        <Icon name="hide" />
      </BarButton>
      <BarButton label={quitArmed ? 'Click again to quit Divine Mirror' : 'Quit Divine Mirror'} danger armed={quitArmed} onClick={quit}>
        <Icon name="power" />
        {quitArmed && <span>Quit?</span>}
      </BarButton>
    </div>
  )
}
