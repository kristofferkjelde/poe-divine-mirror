import { app, globalShortcut, Menu, nativeImage, Tray } from 'electron'
import { join } from 'node:path'
import { HOTKEY_LABELS } from '../shared/settings'
import { copyHoveredItem } from './clipboard'
import { GearStore } from './gearStore'
import { Hotkeys } from './hotkeys'
import { Overlay } from './overlay'
import { SettingsStore } from './settingsStore'
import { SettingsWindow } from './settingsWindow'

const FOCUS_RETURN_MS = 60

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let tray: Tray | null = null

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  void app.whenReady().then(start)
}

function start(): void {
  const store = new SettingsStore()
  const overlay = new Overlay(store)
  const gearStore = new GearStore()
  let busy = false

  const capture = async (equip: boolean) => {
    if (busy) return
    busy = true
    try {
      if (overlay.hide()) await delay(FOCUS_RETURN_MS)
      const text = await copyHoveredItem()
      if (!text) return
      const equippedTo = equip ? await gearStore.equip(text).catch(() => undefined) : undefined
      overlay.show({
        text,
        capturedAt: Date.now(),
        gear: gearStore.current,
        hotkeys: hotkeys.current,
        locked: store.current.overlayLocked,
        equippedTo,
      })
    } finally {
      busy = false
    }
  }

  const hotkeys = new Hotkeys(store, {
    compare: () => void capture(false),
    equip: () => void capture(true),
  })
  const settingsWindow = new SettingsWindow(store, hotkeys)

  tray = new Tray(nativeImage.createFromPath(join(__dirname, '../../resources/icon.png')))
  const refreshTray = () => {
    const settings = store.current
    const unavailable = hotkeys.unavailableActions
    tray?.setToolTip(
      unavailable.length === 0
        ? `PoE Item Checker: hover an item and press ${settings.hotkeys.compare}`
        : 'PoE Item Checker: a hotkey is taken by another app. Open Settings to change it.',
    )
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        { label: `${settings.hotkeys.compare}: ${HOTKEY_LABELS.compare.toLowerCase()}`, enabled: false },
        { label: `${settings.hotkeys.equip}: ${HOTKEY_LABELS.equip.toLowerCase()}`, enabled: false },
        { type: 'separator' },
        { label: 'Settings…', click: () => settingsWindow.open() },
        {
          label: 'Lock overlay position',
          type: 'checkbox',
          checked: settings.overlayLocked,
          click: (item) => void store.update({ overlayLocked: item.checked }),
        },
        { label: 'Clear saved gear', click: () => void gearStore.clear() },
        { label: 'Quit', click: () => app.quit() },
      ]),
    )
  }
  refreshTray()
  store.onChange(refreshTray)
  tray.on('double-click', () => settingsWindow.open())
  if (hotkeys.unavailableActions.length > 0) settingsWindow.open()
}

app.on('window-all-closed', () => {})
app.on('will-quit', () => globalShortcut.unregisterAll())
