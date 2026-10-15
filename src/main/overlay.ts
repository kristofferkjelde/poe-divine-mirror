import { BrowserWindow, ipcMain, screen } from 'electron'
import { IPC, type CapturedItem } from '../shared/ipc'
import { loadRenderer, PRELOAD_PATH } from './renderer'

const WIDTH = 420
const MAX_HEIGHT = 720
const CURSOR_OFFSET = 24

export class Overlay {
  private readonly window: BrowserWindow
  private height = MAX_HEIGHT
  private anchor = { x: 0, y: 0 }

  constructor() {
    this.window = new BrowserWindow({
      width: WIDTH,
      height: this.height,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
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
    this.window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        event.preventDefault()
        this.hide()
      }
    })

    ipcMain.on(IPC.overlayHide, () => this.hide())
    ipcMain.on(IPC.overlayResize, (_event, height: unknown) => {
      if (typeof height !== 'number' || !Number.isFinite(height)) return
      this.height = Math.min(Math.ceil(height), MAX_HEIGHT)
      this.reposition()
    })

    void loadRenderer(this.window)
  }

  get visible(): boolean {
    return this.window.isVisible()
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

  private reposition(): void {
    const { workArea } = screen.getDisplayNearestPoint(this.anchor)
    const fitsRight = this.anchor.x + CURSOR_OFFSET + WIDTH <= workArea.x + workArea.width
    const x = fitsRight ? this.anchor.x + CURSOR_OFFSET : this.anchor.x - CURSOR_OFFSET - WIDTH
    const y = Math.min(Math.max(this.anchor.y - this.height / 2, workArea.y), workArea.y + workArea.height - this.height)
    this.window.setBounds({ x: Math.round(x), y: Math.round(y), width: WIDTH, height: this.height })
  }
}
