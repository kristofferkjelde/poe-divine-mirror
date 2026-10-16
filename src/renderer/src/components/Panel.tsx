import type { ReactNode } from 'react'
import type { Settings } from '../../../shared/settings'
import { setOverlayLocked } from '../overlayStore'

const TYPING_FIELDS = 'input:not([type="checkbox"]):not([type="range"]), select, textarea'

const reportHeight = (node: HTMLElement | null) => {
  if (!node) return
  const observer = new ResizeObserver(([entry]) => void window.overlay.resize(entry.borderBoxSize[0].blockSize))
  observer.observe(node)
  return () => observer.disconnect()
}

interface Props {
  hotkeys: Settings['hotkeys']
  locked: boolean
  children: ReactNode
}

export function Panel({ hotkeys, locked, children }: Props) {
  return (
    <>
      <div
        className="panel-scroll"
        onPointerDownCapture={(event) => {
          if (event.target instanceof Element && event.target.closest(TYPING_FIELDS)) void window.overlay.startTyping()
        }}
      >
        <div ref={reportHeight} className="panel" data-locked={locked}>
          {children}
          <footer className="panel-footer">
            <span>
              {hotkeys.compare} compare · {hotkeys.equip} equip · {hotkeys.price} price
            </span>
            <span className="panel-actions">
              <button
                type="button"
                className="panel-link"
                aria-pressed={locked}
                title={locked ? 'Position locked. Click to allow dragging.' : 'Drag this bar to move the panel. Click to lock.'}
                onClick={() => void setOverlayLocked(!locked)}
              >
                {locked ? '🔒 Locked' : '🔓 Move'}
              </button>
              <button type="button" className="panel-link" onClick={() => void window.overlay.openSettings()}>
                Settings
              </button>
              <button type="button" className="panel-link" onClick={() => void window.overlay.hide()}>
                Esc
              </button>
            </span>
          </footer>
        </div>
      </div>
      <button type="button" className="panel-close" aria-label="Close" title="Close (Esc)" onClick={() => void window.overlay.hide()}>
        ✕
      </button>
    </>
  )
}
