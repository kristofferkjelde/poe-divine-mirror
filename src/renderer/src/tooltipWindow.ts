import { TOOLTIP_FRAME } from '../../shared/ipc'

let tooltip: Window | null = null

function open(): Window | null {
  const child = window.open('about:blank', TOOLTIP_FRAME)
  if (!child) return null
  const { head, body, documentElement } = child.document
  for (const sheet of document.querySelectorAll('link[rel="stylesheet"], style')) {
    if (sheet instanceof HTMLLinkElement) {
      const link = child.document.createElement('link')
      link.rel = 'stylesheet'
      link.href = sheet.href
      head.append(link)
    } else {
      const style = child.document.createElement('style')
      style.textContent = sheet.textContent
      head.append(style)
    }
  }
  documentElement.classList.add('tooltip-window')
  body.className = 'tooltip-body'
  return child
}

export function tooltipDocument(): Document | null {
  if (!tooltip || tooltip.closed) tooltip = open()
  if (tooltip) tooltip.document.documentElement.dataset.theme = document.documentElement.dataset.theme
  return tooltip?.document ?? null
}

export function measureTooltip(node: HTMLElement | null) {
  if (!node) return
  const view = node.ownerDocument.defaultView ?? window
  const observer = new view.ResizeObserver(([entry]) => void window.overlay.showTooltip(entry.borderBoxSize[0].blockSize))
  observer.observe(node)
  return () => {
    observer.disconnect()
    void window.overlay.hideTooltip()
  }
}
