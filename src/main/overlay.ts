import { BrowserWindow, ipcMain, screen } from 'electron'
import { IPC, type CapturedItem } from '../shared/ipc'
import { loadRenderer, PRELOAD_PATH } from './renderer'

const WIDTH = 440
const SCREEN_MARGIN = 24

export class Overlay {
  private readonly window: BrowserWindow
  private height = 600
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
      this.height = Math.ceil(height)
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
    const height = Math.min(this.height, workArea.height - SCREEN_MARGIN * 2)
    this.window.setBounds({
      x: Math.round(workArea.x + (workArea.width - WIDTH) / 2),
      y: Math.round(workArea.y + (workArea.height - height) / 2),
      width: WIDTH,
      height,
    })
  }
}
