import { app, globalShortcut, Menu, nativeImage, Notification, session, Tray } from 'electron'
import { uIOhook } from 'uiohook-napi'
import type { OverlayApi } from '../shared/ipc'
import { HOTKEY_ACTIONS, HOTKEY_LABELS, type HotkeyAction } from '../shared/settings'
import { overlayHandlers, settingsHandlers } from './api'
import { BuildStore } from './buildStore'
import { CharacterStore } from './characterStore'
import { ClientLog } from './clientLog'
import { copyHoveredItem } from './clipboard'
import { GearStore } from './gearStore'
import { Hotkeys } from './hotkeys'
import { serveApp } from './appScheme'
import { registerSchemes, serveCachedImages } from './imageCache'
import { registerHandlers } from './ipc'
import { Overlay } from './overlay'
import { mayNavigate } from './pageReader'
import { ICON_PATH } from './renderer'
import { SettingsStore } from './settingsStore'
import { SettingsWindow } from './settingsWindow'
import { TradeClient } from './trade'
import { Updates } from './updates'
import { trayTooltip, updateMenuItem } from './updateStatus'

let tray: Tray | null = null

registerSchemes()
Menu.setApplicationMenu(null)

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  void app.whenReady().then(start)
}

function start(): void {
  app.setAppUserModelId('io.kjelde.poe-item-checker')
  serveCachedImages()
  serveApp()
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
  const store = new SettingsStore()
  const overlay = new Overlay(store)
  const characters = new CharacterStore()
  const gear = new GearStore(characters)
  const builds = new BuildStore(characters)
  const trade = new TradeClient()

  const pushPreferences = () =>
    overlay.send('preferences', {
      hotkeys: store.current.hotkeys,
      locked: store.current.overlayLocked,
      theme: store.current.theme,
    })
  const pushGear = () => overlay.send('gear', { gear: gear.current, build: builds.current, character: characters.active })
  overlay.onReady(() => {
    pushPreferences()
    pushGear()
  })
  store.watch((settings) => [settings.hotkeys, settings.overlayLocked, settings.theme], pushPreferences)
  gear.onChange(pushGear)
  builds.onChange(pushGear)
  characters.onChange(pushGear)
  new ClientLog(characters).start()

  let busy = false
  let queued: HotkeyAction | null = null

  const capture = async (mode: HotkeyAction) => {
    if (busy) {
      queued = mode
      return
    }
    busy = true
    try {
      const overlayVisible = overlay.visible
      if (overlay.hovered) return overlay.show({ kind: 'missed', mode, overlayVisible })
      const text = await copyHoveredItem()
      if (!text) return overlay.show({ kind: 'missed', mode, overlayVisible })
      const equippedTo = mode === 'equip' ? await gear.equip(text, builds.current).catch(() => undefined) : undefined
      overlay.show({ kind: 'item', text, mode, equippedTo })
    } finally {
      busy = false
      const next = queued
      queued = null
      if (next) void capture(next)
    }
  }

  const hotkeys = new Hotkeys(
    store,
    Object.fromEntries(HOTKEY_ACTIONS.map((action) => [action, () => void capture(action)])) as Record<HotkeyAction, () => void>,
  )
  const settingsWindow = new SettingsWindow(hotkeys, store, settingsHandlers({ store, builds, characters, hotkeys, trade }))
  registerHandlers<OverlayApi>(overlay.ipc, 'overlay', overlayHandlers({ store, gear, builds, characters, hotkeys, trade, overlay, settingsWindow }))

  const updates = new Updates()
  tray = new Tray(nativeImage.createFromPath(ICON_PATH))
  const refreshTray = () => {
    const settings = store.current
    const unavailable = hotkeys.unavailableActions
    const update = updateMenuItem(updates.status)
    tray?.setToolTip(
      trayTooltip(
        app.getVersion(),
        updates.status,
        unavailable.length === 0
          ? `Hover an item and press ${settings.hotkeys.compare}`
          : 'A hotkey is taken by another app. Open Settings to change it.',
      ),
    )
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        { label: `Divine Mirror ${app.getVersion()}`, enabled: false },
        {
          label: update.label,
          enabled: update.action !== undefined,
          click: () => {
            if (update.action === 'check') updates.check()
            if (update.action === 'download') updates.download()
            if (update.action === 'install') updates.install()
          },
        },
        { type: 'separator' },
        ...HOTKEY_ACTIONS.map((action) => ({
          label: `${settings.hotkeys[action]}: ${HOTKEY_LABELS[action].toLowerCase()}`,
          enabled: false,
        })),
        { type: 'separator' },
        { label: 'Settings…', click: () => settingsWindow.open() },
        {
          label: 'Lock overlay position',
          type: 'checkbox',
          checked: settings.overlayLocked,
          click: (item) => void store.update({ overlayLocked: item.checked }),
        },
        { label: 'Clear saved gear', click: () => void gear.clear() },
        { label: 'Quit', click: () => app.quit() },
      ]),
    )
  }
  refreshTray()
  store.watch((settings) => [settings.hotkeys, settings.overlayLocked], refreshTray)
  updates.onChange(refreshTray)
  updates.start()
  tray.on('double-click', () => settingsWindow.open())
  app.on('second-instance', () => settingsWindow.open())
  warnTakenHotkeys(hotkeys.unavailableActions.map((action) => store.current.hotkeys[action]), () => settingsWindow.open())
}

function warnTakenHotkeys(taken: string[], openSettings: () => void): void {
  if (taken.length === 0) return
  if (!Notification.isSupported()) return openSettings()
  const notification = new Notification({
    title: 'Divine Mirror',
    body: `${taken.join(', ')} ${taken.length === 1 ? 'is' : 'are'} taken by another app. Click to change.`,
    icon: ICON_PATH,
  })
  notification.on('click', openSettings)
  notification.show()
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!mayNavigate(contents, url)) event.preventDefault()
  })
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})

app.on('window-all-closed', () => {})
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  try {
    uIOhook.stop()
  } catch {}
})
