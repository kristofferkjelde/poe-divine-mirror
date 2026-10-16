import { useSyncExternalStore } from 'react'
import type { TooltipContent } from '../../shared/ipc'
import { ItemCard } from './components/ItemCard'

let content: TooltipContent | null = null
const listeners = new Set<() => void>()

window.tooltip.onContent((next) => {
  content = next
  listeners.forEach((listener) => listener())
})
void window.tooltip.ready()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

const reportHeight = (id: number) => (node: HTMLElement | null) => {
  if (!node) return
  void window.tooltip.rendered(id, node.getBoundingClientRect().height)
  const observer = new ResizeObserver(([entry]) => void window.tooltip.rendered(id, entry.borderBoxSize[0].blockSize))
  observer.observe(node)
  return () => observer.disconnect()
}

export function TooltipApp() {
  const current = useSyncExternalStore(subscribe, () => content)
  if (!current) return null
  return (
    <div key={current.id} ref={reportHeight(current.id)} className="window listing-preview">
      <ItemCard item={current.item} />
    </div>
  )
}
