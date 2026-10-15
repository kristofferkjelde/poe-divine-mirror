import type { ReactNode } from 'react'
import type { Settings } from '../../../shared/settings'

const reportHeight = (node: HTMLElement | null) => {
  if (!node) return
  const observer = new ResizeObserver(([entry]) => window.overlay.resize(entry.borderBoxSize[0].blockSize))
  observer.observe(node)
  return () => observer.disconnect()
}

export function Panel({ hotkeys, children }: { hotkeys: Settings['hotkeys']; children: ReactNode }) {
  return (
    <div ref={reportHeight} className="panel">
      {children}
      <footer className="panel-footer">
        <span>
          {hotkeys.compare} compare · {hotkeys.equip} set equipped
        </span>
        <span className="panel-actions">
          <button type="button" className="panel-link" onClick={() => window.overlay.openSettings()}>
            Settings
          </button>
          <button type="button" className="panel-link" onClick={() => window.overlay.hide()}>
            Esc close
          </button>
        </span>
      </footer>
    </div>
  )
}
