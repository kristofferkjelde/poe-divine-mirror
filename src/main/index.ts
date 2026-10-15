import { app, globalShortcut, ipcMain, Menu, nativeImage, shell, Tray } from 'electron'
import { uIOhook } from 'uiohook-napi'
import { GEAR_SLOT_LABELS, type GearSlot } from '../shared/gear'
import { IPC } from '../shared/ipc'
import { HOTKEY_LABELS, type HotkeyAction } from '../shared/settings'
import { BuildStore } from './buildStore'
import { copyHoveredItem } from './clipboard'
import { GearStore } from './gearStore'
import { Hotkeys } from './hotkeys'
import { Overlay } from './overlay'
import { ICON_PATH } from './renderer'
import { SettingsStore } from './settingsStore'
import { SettingsWindow } from './settingsWindow'
import { TradeClient } from './trade'
import { TRADE_ORIGIN } from '../shared/trade/price'

const FOCUS_RETURN_MS = 120
const MISSED_ITEM = 'Couldn\'t read an item. Hover it in the game and press the hotkey again.'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
  const gearStore = new GearStore()
  const builds = new BuildStore()
  const trade = new TradeClient()
  ipcMain.handle(IPC.tradePrepare, (_event, text: unknown) =>
    typeof text === 'string' ? trade.prepare(text) : { ok: false, error: 'No item to price' },
  )
  ipcMain.handle(IPC.tradeSearch, (_event, search: unknown) => trade.search(search, store.current.league))
  ipcMain.on(IPC.openTrade, (_event, url: unknown) => {
    if (typeof url === 'string' && url.startsWith(`${TRADE_ORIGIN}/trade2/`)) void shell.openExternal(url)
  })
  ipcMain.handle(IPC.gearForget, async (_event, slot: unknown) => {
    if (typeof slot === 'string' && slot in GEAR_SLOT_LABELS) await gearStore.forget(slot as GearSlot)
  })
  let busy = false
  let queued: HotkeyAction | null = null

  const capture = async (mode: HotkeyAction) => {
    if (busy) {
      queued = mode
      return
    }
    busy = true
    try {
      if (overlay.hide().wasFocused) await delay(FOCUS_RETURN_MS)
      const text = await copyHoveredItem()
      const shared = {
        capturedAt: Date.now(),
        gear: gearStore.current,
        hotkeys: hotkeys.current,
        locked: store.current.overlayLocked,
        build: builds.current,
      }
      if (!text) {
        overlay.show({ ...shared, text: '', missed: MISSED_ITEM })
        return
      }
      const equippedTo = mode === 'equip' ? await gearStore.equip(text, builds.current).catch(() => undefined) : undefined
      overlay.show({ ...shared, text, equippedTo, priceCheck: mode === 'price' })
    } finally {
      busy = false
      const next = queued
      queued = null
      if (next) void capture(next)
    }
  }

  const hotkeys = new Hotkeys(store, {
    compare: () => void capture('compare'),
    equip: () => void capture('equip'),
    price: () => void capture('price'),
  })
  const settingsWindow = new SettingsWindow(store, hotkeys, builds, trade)

  tray = new Tray(nativeImage.createFromPath(ICON_PATH))
  const refreshTray = () => {
    const settings = store.current
    const unavailable = hotkeys.unavailableActions
    tray?.setToolTip(
      unavailable.length === 0
        ? `Divine Mirror: hover an item and press ${settings.hotkeys.compare}`
        : 'Divine Mirror: a hotkey is taken by another app. Open Settings to change it.',
    )
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        { label: `${settings.hotkeys.compare}: ${HOTKEY_LABELS.compare.toLowerCase()}`, enabled: false },
        { label: `${settings.hotkeys.equip}: ${HOTKEY_LABELS.equip.toLowerCase()}`, enabled: false },
        { label: `${settings.hotkeys.price}: ${HOTKEY_LABELS.price.toLowerCase()}`, enabled: false },
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
