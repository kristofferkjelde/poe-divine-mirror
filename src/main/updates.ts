import { app, Notification } from 'electron'
import type { AppUpdater } from 'electron-updater'
import type { UpdateStatus } from './updateStatus'

const FIRST_CHECK_MS = 15_000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

export class Updates {
  private state: UpdateStatus = { kind: 'idle' }
  private readonly listeners = new Set<() => void>()
  private announced: string | null = null
  private updater: Promise<AppUpdater> | null = null

  private load(): Promise<AppUpdater> {
    this.updater ??= import('electron-updater').then((module) => {
      const { autoUpdater } = module.default ?? module
      this.listen(autoUpdater)
      return autoUpdater
    })
    return this.updater
  }

  private listen(autoUpdater: AppUpdater): void {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('update-available', ({ version }) => {
      this.set({ kind: 'available', version })
      this.announce(version)
    })
    autoUpdater.on('update-not-available', () => {
      const manual = this.state.kind === 'checking' && this.state.manual
      this.set({ kind: 'latest' })
      if (manual) notify('Divine Mirror is up to date', `You have the latest version, ${app.getVersion()}.`)
    })
    autoUpdater.on('download-progress', ({ percent }) => {
      if (this.state.kind === 'available' || this.state.kind === 'downloading') {
        this.set({ kind: 'downloading', version: this.state.version, percent })
      }
    })
    autoUpdater.on('update-downloaded', ({ version }) => {
      this.set({ kind: 'ready', version })
      this.install()
    })
    autoUpdater.on('error', (error: Error) => {
      const manual = this.state.kind === 'checking' && this.state.manual
      const downloading = this.state.kind === 'downloading'
      this.set({ kind: 'failed', message: error.message })
      if (manual || downloading) notify('Could not update Divine Mirror', 'Check your connection and try again from the tray menu.')
    })
  }

  get status(): UpdateStatus {
    return this.state
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener)
  }

  start(): void {
    if (!app.isPackaged) return
    setTimeout(() => this.check(false), FIRST_CHECK_MS)
    setInterval(() => this.check(false), CHECK_EVERY_MS)
  }

  check(manual = true): void {
    if (!app.isPackaged || ['checking', 'downloading', 'ready'].includes(this.state.kind)) return
    this.set({ kind: 'checking', manual })
    this.load()
      .then((updater) => updater.checkForUpdates())
      .catch((error: unknown) => {
        if (this.state.kind === 'checking') this.set({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
      })
  }

  update(): void {
    if (this.state.kind === 'ready') this.install()
    if (this.state.kind !== 'available') return
    this.set({ kind: 'downloading', version: this.state.version, percent: 0 })
    void this.load()
      .then((updater) => updater.downloadUpdate())
      .catch(() => {})
  }

  private install(): void {
    if (this.state.kind === 'ready') void this.load().then((updater) => updater.quitAndInstall(true, true))
  }

  private announce(version: string): void {
    if (this.announced === version) return
    this.announced = version
    notify(
      `Divine Mirror ${version} is out`,
      'Click here, or use the tray menu, to update. Divine Mirror restarts by itself when it is done.',
      () => this.update(),
    )
  }

  private set(next: UpdateStatus): void {
    this.state = next
    this.listeners.forEach((listener) => listener())
  }
}

function notify(title: string, body: string, onClick?: () => void): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body })
  if (onClick) notification.on('click', onClick)
  notification.show()
}
