import { BrowserWindow, globalShortcut, screen, type Rectangle } from 'electron'
import { EventType, uIOhook, type UiohookKeyboardEvent, type UiohookMouseEvent, type UiohookWheelEvent } from 'uiohook-napi'
import { messageChannel, type OverlayEvent, type OverlayMessages } from '../shared/ipc'
import type { ParsedItem } from '../shared/item/types'
import { Tooltip } from './tooltip'
import { loadRenderer, PRELOAD_PATH } from './renderer'
import { THEME_BACKGROUNDS } from '../shared/settings'
import type { SettingsStore } from './settingsStore'

const WIDTH = 440
const SCREEN_MARGIN = 24
const ESCAPE = 'Escape'
const REVEAL_FALLBACK_MS = 150
const PAINT_FALLBACK_MS = 150
const HOOK_IDLE_MS = 60_000
const MOUSE_DRAGGED = 10

type HookEvent = UiohookKeyboardEvent | UiohookMouseEvent | UiohookWheelEvent

export class Overlay {
  private readonly window: BrowserWindow
  private readonly tooltip: Tooltip
  private height = 600
  private anchor = { x: 0, y: 0 }
  private placed: Rectangle | null = null
  private revealTimer: NodeJS.Timeout | undefined
  private paintTimer: NodeJS.Timeout | undefined
  private hooked = false
  private hookIdle: NodeJS.Timeout | undefined
  private stopDrag: (() => void) | null = null
  private readonly readyListeners = new Set<() => void>()

  constructor(private readonly store: SettingsStore) {
    this.window = new BrowserWindow({
      width: WIDTH,
      height: this.height,
      show: false,
      frame: false,
      backgroundColor: THEME_BACKGROUNDS[store.current.theme],
      resizable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      fullscreenable: false,
      hasShadow: false,
      webPreferences: {
        preload: PRELOAD_PATH,
        sandbox: true,
        zoomFactor: store.current.uiScale / 100,
      },
    })
    this.window.setAlwaysOnTop(true, 'screen-saver')
    this.window.webContents.on('did-finish-load', () => this.window.webContents.setZoomFactor(this.scale))
    uIOhook.on('mousedown', () => {
      if (this.window.isVisible() && !this.contains(screen.getCursorScreenPoint())) this.hide()
    })
    this.window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        event.preventDefault()
        this.hide()
      }
    })
    store.watch(
      (settings) => [settings.uiScale, settings.overlayPosition],
      () => {
        this.window.webContents.setZoomFactor(this.scale)
        if (this.window.isVisible()) this.reposition()
      },
    )
    store.watch(
      (settings) => settings.theme,
      (theme) => this.window.setBackgroundColor(THEME_BACKGROUNDS[theme]),
    )

    this.tooltip = new Tooltip(store, () => this.window.getBounds())
    void loadRenderer(this.window, store.current.theme)
  }

  get ipc(): Electron.WebContents['ipc'] {
    return this.window.webContents.ipc
  }

  private get scale(): number {
    return this.store.current.uiScale / 100
  }

  get visible(): boolean {
    return this.window.isVisible()
  }

  get hovered(): boolean {
    return this.window.isVisible() && this.contains(screen.getCursorScreenPoint())
  }

  onReady(listener: () => void): void {
    this.readyListeners.add(listener)
  }

  ready(): void {
    this.readyListeners.forEach((listener) => listener())
  }

  send<K extends keyof OverlayMessages>(name: K, payload: OverlayMessages[K]): void {
    this.window.webContents.send(messageChannel(name), payload)
  }

  show(event: OverlayEvent): void {
    this.anchor = screen.getCursorScreenPoint()
    this.send('event', event)
    clearTimeout(this.revealTimer)
    this.revealTimer = setTimeout(() => this.reveal(), REVEAL_FALLBACK_MS)
  }

  rendered(height: number): void {
    clearTimeout(this.revealTimer)
    this.height = Math.ceil(height)
    this.reposition()
    this.reveal()
  }

  painted(): void {
    clearTimeout(this.paintTimer)
    this.window.setOpacity(1)
    this.watchClicks(true)
  }

  resize(height: number): void {
    this.height = Math.ceil(height)
    if (this.window.isVisible()) this.reposition()
  }

  private reveal(): void {
    if (!this.window.isVisible()) {
      if (!this.placed) this.reposition()
      this.window.setOpacity(0)
      this.window.showInactive()
      this.send('revealed', null)
      clearTimeout(this.paintTimer)
      this.paintTimer = setTimeout(() => this.painted(), PAINT_FALLBACK_MS)
    } else {
      this.watchClicks(true)
    }
    if (!globalShortcut.isRegistered(ESCAPE)) {
      try {
        globalShortcut.register(ESCAPE, () => this.hide())
      } catch {}
    }
  }

  showTooltip(item: ParsedItem): void {
    if (this.window.isVisible() && !this.stopDrag) this.tooltip.show(item)
  }

  hideTooltip(): void {
    this.tooltip.hide()
  }

  startDrag(): void {
    if (this.stopDrag || this.store.current.overlayLocked || !this.window.isVisible()) return
    this.hideTooltip()
    this.watchClicks(true)
    const [x, y] = this.window.getPosition()
    const start = screen.getCursorScreenPoint()
    const move = () => {
      const cursor = screen.getCursorScreenPoint()
      this.window.setPosition(x + cursor.x - start.x, y + cursor.y - start.y)
    }
    const follow = (event: HookEvent) => {
      if (event.type === EventType.EVENT_MOUSE_MOVED || (event.type as number) === MOUSE_DRAGGED) move()
      else if (event.type === EventType.EVENT_MOUSE_RELEASED) this.endDrag()
    }
    uIOhook.on('input', follow)
    this.stopDrag = () => {
      uIOhook.off('input', follow)
      this.stopDrag = null
      move()
    }
  }

  endDrag(): void {
    if (!this.stopDrag) return
    this.stopDrag()
    this.rememberPosition()
  }

  hide(): void {
    clearTimeout(this.revealTimer)
    this.endDrag()
    this.hideTooltip()
    if (globalShortcut.isRegistered(ESCAPE)) globalShortcut.unregister(ESCAPE)
    if (this.window.isVisible()) this.window.hide()
    clearTimeout(this.hookIdle)
    this.hookIdle = setTimeout(() => this.watchClicks(false), HOOK_IDLE_MS)
  }

  private watchClicks(on: boolean): void {
    if (on) clearTimeout(this.hookIdle)
    if (on === this.hooked) return
    try {
      if (on) uIOhook.start()
      else uIOhook.stop()
      this.hooked = on
    } catch (error) {
      console.error('Could not watch mouse clicks', error)
    }
  }

  private contains({ x, y }: { x: number; y: number }): boolean {
    const bounds = this.window.getBounds()
    return x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height
  }

  private rememberPosition(): void {
    const [x, y] = this.window.getPosition()
    if (this.placed && this.placed.x === x && this.placed.y === y) return
    if (this.store.current.overlayLocked) return
    void this.store.update({ overlayPosition: { x, y } })
  }

  private reposition(): void {
    const saved = this.store.current.overlayPosition
    const { workArea } = screen.getDisplayNearestPoint(saved ?? this.anchor)
    const width = Math.round(WIDTH * this.scale)
    const height = Math.min(Math.ceil(this.height * this.scale), workArea.height - SCREEN_MARGIN * 2)
    const bottom = workArea.y + workArea.height - height
    const top = this.window.isVisible() && this.placed ? this.placed.y : workArea.y + (workArea.height - height) / 2
    const bounds = saved
      ? {
          x: clamp(saved.x, workArea.x, workArea.x + workArea.width - width),
          y: clamp(saved.y, workArea.y, bottom),
        }
      : {
          x: Math.round(workArea.x + (workArea.width - width) / 2),
          y: clamp(top, workArea.y, bottom),
        }
    this.placed = { ...bounds, width, height }
    this.window.setBounds(this.placed)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(value, min), max))
}
