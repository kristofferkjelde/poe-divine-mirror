import { BrowserWindow, screen } from 'electron'
import { TOP_BAR_ARGUMENT, TOP_BAR_CHANNEL, type TopBarApi, type TopBarState } from '../shared/ipc'
import { THEME_BACKGROUNDS, type Point } from '../shared/settings'
import type { CharacterStore } from './characterStore'
import { registerHandlers, type Handlers } from './ipc'
import { followCursor, holdMouseHook } from './mouseHook'
import { loadRenderer, PRELOAD_PATH } from './renderer'
import type { SettingsStore } from './settingsStore'

const TOP_MARGIN = 4
const FIRST_SIZE = { width: 400, height: 34 }

export type TopBarActions = Omit<TopBarApi, 'ready' | 'rendered' | 'startDrag' | 'endDrag'>

const isLength = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0

export class TopBar {
  private window: BrowserWindow | null = null
  private size = FIRST_SIZE
  private anchor: Point | null = null
  private stopDrag: (() => void) | null = null

  constructor(
    private readonly store: SettingsStore,
    private readonly characters: CharacterStore,
    private readonly actions: Handlers<TopBarActions>,
  ) {
    store.watch(
      (settings) => settings.topBar,
      () => this.sync(),
    )
    store.watch(
      (settings) => [settings.theme, settings.overlayLocked],
      () => this.push(),
    )
    store.watch(
      (settings) => settings.theme,
      (theme) => this.window?.setBackgroundColor(THEME_BACKGROUNDS[theme]),
    )
    store.watch(
      (settings) => settings.uiScale,
      () => this.window?.webContents.setZoomFactor(this.scale),
    )
    characters.onChange(() => this.push())
    screen.on('display-metrics-changed', () => this.place())
    this.sync()
  }

  private get scale(): number {
    return this.store.current.uiScale / 100
  }

  private get state(): TopBarState {
    const { theme, overlayLocked } = this.store.current
    return { theme, locked: overlayLocked, characters: this.characters.current }
  }

  private sync(): void {
    if (!this.store.current.topBar) this.close()
    else if (!this.window) this.create()
  }

  private create(): void {
    const window = new BrowserWindow({
      ...this.size,
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
        additionalArguments: [TOP_BAR_ARGUMENT],
      },
    })
    window.setAlwaysOnTop(true, 'screen-saver')
    window.webContents.on('did-finish-load', () => window.webContents.setZoomFactor(this.scale))
    registerHandlers<TopBarApi>(window.webContents.ipc, 'topBar', {
      ...this.actions,
      ready: () => this.push(),
      rendered: (width, height) => {
        if (isLength(width) && isLength(height)) this.resize(width, height)
      },
      startDrag: () => this.startDrag(),
      endDrag: () => this.endDrag(),
    })
    window.on('closed', () => {
      if (this.window === window) this.window = null
      this.endDrag()
    })
    this.window = window
    void loadRenderer(window, this.store.current.theme, 'top-bar')
  }

  private close(): void {
    this.endDrag()
    this.window?.close()
  }

  private push(): void {
    this.window?.webContents.send(TOP_BAR_CHANNEL, this.state)
  }

  private resize(width: number, height: number): void {
    const window = this.window
    if (!window) return
    const zoom = window.webContents.getZoomFactor()
    this.size = { width: Math.ceil(width * zoom), height: Math.ceil(height * zoom) }
    this.place()
    if (!window.isVisible()) window.showInactive()
  }

  private place(): void {
    const window = this.window
    if (!window || this.stopDrag) return
    const point = this.store.current.topBarPosition ?? this.anchor
    const { bounds } = point ? screen.getDisplayNearestPoint(point) : screen.getPrimaryDisplay()
    const { width, height } = this.size
    this.anchor = point
      ? {
          x: clamp(point.x, bounds.x, bounds.x + bounds.width - width),
          y: clamp(point.y, bounds.y, bounds.y + bounds.height - height),
        }
      : { x: Math.round(bounds.x + (bounds.width - width) / 2), y: bounds.y + TOP_MARGIN }
    window.setBounds({ ...this.anchor, width, height })
  }

  private startDrag(): void {
    const window = this.window
    if (!window || this.stopDrag) return
    holdMouseHook('top-bar', true)
    const stop = followCursor(window, () => this.endDrag())
    this.stopDrag = () => {
      this.stopDrag = null
      stop()
      holdMouseHook('top-bar', false)
    }
  }

  private endDrag(): void {
    if (!this.stopDrag) return
    this.stopDrag()
    if (!this.window) return
    const [x, y] = this.window.getPosition()
    this.anchor = { x, y }
    void this.store.update({ topBarPosition: { x, y } })
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(value, min), max))
}
