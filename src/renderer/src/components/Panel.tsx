import type { ReactNode } from 'react'
import { HOTKEYS } from '../../../shared/ipc'

const reportHeight = (node: HTMLElement | null) => {
  if (!node) return
  const observer = new ResizeObserver(([entry]) => window.overlay.resize(entry.borderBoxSize[0].blockSize))
  observer.observe(node)
  return () => observer.disconnect()
}

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div ref={reportHeight} className="panel">
      {children}
      <footer className="panel-footer">
        <span>
          {HOTKEYS.compare} compare · {HOTKEYS.equip} set equipped
        </span>
        <button type="button" className="panel-close" onClick={() => window.overlay.hide()}>
          Esc close
        </button>
      </footer>
    </div>
  )
}
