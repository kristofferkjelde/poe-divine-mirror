import { BrowserWindow, ipcMain, screen, type Rectangle } from 'electron'
import { IPC, type CapturedItem } from '../shared/ipc'
import { loadRenderer, PRELOAD_PATH } from './renderer'
import type { SettingsStore } from './settingsStore'

const WIDTH = 440
const SCREEN_MARGIN = 24

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

    ipcMain.on(IPC.overlayHide, () => this.hide())
    ipcMain.on(IPC.overlayResize, (_event, height: unknown) => {
      if (typeof height !== 'number' || !Number.isFinite(height)) return
      this.height = Math.ceil(height)
      this.reposition()
    })

    void loadRenderer(this.window)
  }

  show(item: CapturedItem): void {
    this.window.webContents.send(IPC.itemCaptured, item)
    this.anchor = screen.getCursorScreenPoint()
    this.reposition()
    this.window.show()
    this.window.focus()
  }

  hide(): boolean {
    if (!this.window.isVisible()) return false
    this.window.hide()
    return true
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
