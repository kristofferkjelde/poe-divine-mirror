import { app, globalShortcut, Menu, nativeImage, Tray } from 'electron'
import { uIOhook } from 'uiohook-napi'
import type { OverlayApi, SettingsApi } from '../shared/ipc'
import { HOTKEY_ACTIONS, HOTKEY_LABELS, type HotkeyAction } from '../shared/settings'
import { overlayHandlers, settingsHandlers } from './api'
import { BuildStore } from './buildStore'
import { copyHoveredItem } from './clipboard'
import { delay } from './delay'
import { GearStore } from './gearStore'
import { Hotkeys } from './hotkeys'
import { registerHandlers } from './ipc'
import { Overlay } from './overlay'
import { ICON_PATH } from './renderer'
import { SettingsStore } from './settingsStore'
import { SettingsWindow } from './settingsWindow'
import { TradeClient } from './trade'
import { Updates } from './updates'
import { trayTooltip, updateMenuItem } from './updateStatus'

const FOCUS_RETURN_MS = 120

let tray: Tray | null = null

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  void app.whenReady().then(start)
}

function start(): void {
  app.setAppUserModelId('io.kjelde.poe-item-checker')
  const store = new SettingsStore()
  const overlay = new Overlay(store)
  const gear = new GearStore()
  const builds = new BuildStore()
  const trade = new TradeClient()

  const pushContext = () =>
    overlay.send('context', {
      gear: gear.current,
      hotkeys: store.current.hotkeys,
      locked: store.current.overlayLocked,
      build: builds.current,
    })
  overlay.onLoad(pushContext)
  store.onChange(pushContext)
  gear.onChange(pushContext)
  builds.onChange(pushContext)

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
      if (overlay.focused) {
        overlay.hide()
        await delay(FOCUS_RETURN_MS)
      }
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
  const settingsWindow = new SettingsWindow(hotkeys)
  const services = { store, gear, builds, hotkeys, trade, overlay, settingsWindow }
  registerHandlers<OverlayApi>('overlay', overlayHandlers(services))
  registerHandlers<SettingsApi>('settings', settingsHandlers(services))

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
  store.onChange(refreshTray)
  updates.onChange(refreshTray)
  updates.start()
  tray.on('double-click', () => settingsWindow.open())
  if (hotkeys.unavailableActions.length > 0) settingsWindow.open()
  try {
    uIOhook.start()
  } catch (error) {
    console.error('Could not watch mouse clicks', error)
  }
}

app.on('window-all-closed', () => {})
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  uIOhook.stop()
})
