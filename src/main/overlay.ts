import { BrowserWindow, globalShortcut, screen, type Rectangle } from 'electron'
import { uIOhook } from 'uiohook-napi'
import { messageChannel, type OverlayEvent, type OverlayMessages } from '../shared/ipc'
import { loadRenderer, PRELOAD_PATH } from './renderer'
import type { SettingsStore } from './settingsStore'

const WIDTH = 440
const SCREEN_MARGIN = 24
const ESCAPE = 'Escape'

export class Overlay {
  private readonly window: BrowserWindow
  private height = 600
  private anchor = { x: 0, y: 0 }
  private placed: Rectangle | null = null

  constructor(private readonly store: SettingsStore) {
    this.window = new BrowserWindow({
      width: WIDTH,
      height: this.height,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: !store.current.overlayLocked,
      skipTaskbar: true,
      alwaysOnTop: true,
      fullscreenable: false,
      hasShadow: false,
      webPreferences: {
        preload: PRELOAD_PATH,
        sandbox: true,
      },
    })
    this.window.setAlwaysOnTop(true, 'screen-saver')
    this.window.on('blur', () => this.hide())
    uIOhook.on('mousedown', () => {
      if (this.window.isVisible() && !this.contains(screen.getCursorScreenPoint())) this.hide()
    })
    this.window.on('moved', () => this.rememberPosition())
    this.window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        event.preventDefault()
        this.hide()
      }
    })
    store.onChange(() => {
      this.window.setMovable(!store.current.overlayLocked)
      if (this.window.isVisible()) this.reposition()
    })

    void loadRenderer(this.window)
  }

  get visible(): boolean {
    return this.window.isVisible()
  }

  get focused(): boolean {
    return this.window.isFocused()
  }

  get hovered(): boolean {
    return this.window.isVisible() && this.contains(screen.getCursorScreenPoint())
  }

  onLoad(listener: () => void): void {
    this.window.webContents.on('did-finish-load', listener)
  }

  send<K extends keyof OverlayMessages>(name: K, payload: OverlayMessages[K]): void {
    this.window.webContents.send(messageChannel(name), payload)
  }

  show(event: OverlayEvent): void {
    this.send('event', event)
    this.anchor = screen.getCursorScreenPoint()
    this.reposition()
    this.reveal()
  }

  resize(height: number): void {
    this.height = Math.ceil(height)
    this.reposition()
  }

  private reveal(): void {
    if (!this.window.isVisible()) this.window.showInactive()
    if (!globalShortcut.isRegistered(ESCAPE)) {
      try {
        globalShortcut.register(ESCAPE, () => this.hide())
      } catch {}
    }
  }

  hide(): void {
    if (globalShortcut.isRegistered(ESCAPE)) globalShortcut.unregister(ESCAPE)
    if (this.window.isVisible()) this.window.hide()
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
    const height = Math.min(this.height, workArea.height - SCREEN_MARGIN * 2)
    const bounds = saved
      ? {
          x: clamp(saved.x, workArea.x, workArea.x + workArea.width - WIDTH),
          y: clamp(saved.y, workArea.y, workArea.y + workArea.height - height),
        }
      : {
          x: Math.round(workArea.x + (workArea.width - WIDTH) / 2),
          y: Math.round(workArea.y + (workArea.height - height) / 2),
        }
    this.placed = { ...bounds, width: WIDTH, height }
    this.window.setBounds(this.placed)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(value, min), max))
}
