import { screen, type BrowserWindow } from 'electron'
import { EventType, uIOhook, type UiohookKeyboardEvent, type UiohookMouseEvent, type UiohookWheelEvent } from 'uiohook-napi'

const MOUSE_DRAGGED = 10

type HookEvent = UiohookKeyboardEvent | UiohookMouseEvent | UiohookWheelEvent

const holders = new Set<string>()
let running = false

export function holdMouseHook(holder: string, on: boolean): void {
  if (on) holders.add(holder)
  else holders.delete(holder)
  const wanted = holders.size > 0
  if (wanted === running) return
  try {
    if (wanted) uIOhook.start()
    else uIOhook.stop()
    running = wanted
  } catch (error) {
    console.error('Could not watch the mouse', error)
  }
}

export function followCursor(window: BrowserWindow, onRelease: () => void): () => void {
  const [x, y] = window.getPosition()
  const start = screen.getCursorScreenPoint()
  const move = () => {
    if (window.isDestroyed()) return
    const cursor = screen.getCursorScreenPoint()
    window.setPosition(x + cursor.x - start.x, y + cursor.y - start.y)
  }
  const follow = (event: HookEvent) => {
    if (event.type === EventType.EVENT_MOUSE_MOVED || (event.type as number) === MOUSE_DRAGGED) move()
    else if (event.type === EventType.EVENT_MOUSE_RELEASED) onRelease()
  }
  uIOhook.on('input', follow)
  return () => {
    uIOhook.off('input', follow)
    move()
  }
}
