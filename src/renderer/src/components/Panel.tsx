import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import type { Settings } from '../../../shared/settings'
import { setOverlayLocked } from '../overlayStore'

const DRAG_HANDLES = '.ember-tabs, .item-header, .panel-footer'
const DRAG_THRESHOLD = 4

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
  const [confirmClear, setConfirmClear] = useState(false)
  const hints = `${hotkeys.compare} compare · ${hotkeys.equip} equip · ${hotkeys.price} price`
  const drag = useRef<{ x: number; y: number; moving: boolean } | null>(null)

  const dragged = useRef(false)

  const endDrag = () => {
    if (drag.current?.moving) {
      dragged.current = true
      void window.overlay.endDrag()
    }
    drag.current = null
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.moving) return
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_THRESHOLD) return
    current.moving = true
    event.currentTarget.setPointerCapture(event.pointerId)
    void window.overlay.startDrag()
  }

  return (
    <>
      <div className="panel-scroll">
        <div
          ref={reportHeight}
          className="panel"
          data-locked={locked}
          onPointerDown={(event) => {
            dragged.current = false
            const handle = event.target instanceof Element && event.target.closest(DRAG_HANDLES)
            if (locked || event.button !== 0 || !handle) return
            drag.current = { x: event.clientX, y: event.clientY, moving: false }
          }}
          onClickCapture={(event) => {
            if (!dragged.current) return
            dragged.current = false
            event.stopPropagation()
            event.preventDefault()
          }}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          {children}
          <footer className="panel-footer">
            <span className="panel-hotkeys" title={hints}>
              {hints}
            </span>
            <span className="panel-actions">
              <button
                type="button"
                className="panel-link"
                aria-pressed={locked}
                aria-label={locked ? 'Unlock position' : 'Lock position'}
                title={locked ? 'Position locked. Click to allow dragging.' : 'Drag this bar to move the panel. Click to lock.'}
                onClick={() => void setOverlayLocked(!locked)}
              >
                {locked ? '🔒' : '🔓'}
              </button>
              <button
                type="button"
                className="panel-link"
                data-confirm={confirmClear}
                title="Forget every item you saved as equipped"
                onClick={() => {
                  if (confirmClear) void window.overlay.clearGear()
                  setConfirmClear(!confirmClear)
                }}
                onPointerLeave={() => setConfirmClear(false)}
              >
                {confirmClear ? 'Clear all?' : 'Clear gear'}
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
