import { BrowserWindow, screen, type Rectangle } from 'electron'
import { TOOLTIP_ARGUMENT, TOOLTIP_CHANNEL, type TooltipApi, type TooltipContent } from '../shared/ipc'
import type { ParsedItem } from '../shared/item/types'
import { THEME_BACKGROUNDS } from '../shared/settings'
import { registerHandlers } from './ipc'
import { loadRenderer, PRELOAD_PATH } from './renderer'
import type { SettingsStore } from './settingsStore'

const GAP = 4

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export class Tooltip {
  private window: BrowserWindow | null = null
  private ready = false
  private content: TooltipContent | null = null
  private nextId = 1

  constructor(
    private readonly store: SettingsStore,
    private readonly anchor: () => Rectangle,
  ) {
    store.watch(
      (settings) => settings.uiScale,
      () => this.window?.webContents.setZoomFactor(this.scale),
    )
    store.watch(
      (settings) => settings.theme,
      () => this.window?.close(),
    )
  }

  private get scale(): number {
    return this.store.current.uiScale / 100
  }

  show(item: ParsedItem): void {
    this.content = { id: this.nextId++, item }
    if (!this.window) this.create()
    else if (this.ready) this.send()
  }

  hide(): void {
    if (!this.content) return
    this.content = null
    if (this.window?.isVisible()) this.window.hide()
    if (this.ready) this.send()
  }

  private send(): void {
    this.window?.webContents.send(TOOLTIP_CHANNEL, this.content)
  }

  private create(): void {
    const window = new BrowserWindow({
      width: 440,
      height: 300,
      show: false,
      frame: false,
      backgroundColor: THEME_BACKGROUNDS[this.store.current.theme],
      resizable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      fullscreenable: false,
      hasShadow: false,
      webPreferences: {
        preload: PRELOAD_PATH,
        sandbox: true,
        zoomFactor: this.scale,
        backgroundThrottling: false,
        additionalArguments: [TOOLTIP_ARGUMENT],
      },
    })
    window.setAlwaysOnTop(true, 'screen-saver')
    window.setIgnoreMouseEvents(true)
    window.webContents.on('did-finish-load', () => window.webContents.setZoomFactor(this.scale))
    registerHandlers<TooltipApi>(window.webContents.ipc, 'tooltip', {
      ready: () => {
        this.ready = true
        this.send()
      },
      rendered: (id, height) => {
        if (id === this.content?.id && isFiniteNumber(height)) this.place(height)
      },
    })
    window.on('closed', () => {
      this.window = null
      this.ready = false
    })
    this.window = window
    void loadRenderer(window, this.store.current.theme, 'tooltip')
  }

  private place(height: number): void {
    const window = this.window
    if (!window) return
    const anchor = this.anchor()
    const { workArea } = screen.getDisplayMatching(anchor)
    const zoom = window.webContents.getZoomFactor()
    const size = { width: anchor.width, height: Math.min(Math.ceil(height * zoom), workArea.height) }
    window.setBounds({ ...position(anchor, size, workArea), ...size })
    if (!window.isVisible()) window.showInactive()
  }
}

function position(anchor: Rectangle, { width, height }: { width: number; height: number }, area: Rectangle) {
  const right = area.x + area.width
  const bottom = area.y + area.height
  const top = Math.round(Math.min(Math.max(anchor.y, area.y), bottom - height))
  if (anchor.y + anchor.height + GAP + height <= bottom) return { x: anchor.x, y: anchor.y + anchor.height + GAP }
  if (anchor.y - GAP - height >= area.y) return { x: anchor.x, y: anchor.y - GAP - height }
  if (anchor.x + anchor.width + GAP + width <= right) return { x: anchor.x + anchor.width + GAP, y: top }
  if (anchor.x - GAP - width >= area.x) return { x: anchor.x - GAP - width, y: top }
  return { x: anchor.x, y: bottom - height }
}
