import { app, globalShortcut, Menu, nativeImage, Tray } from 'electron'
import { join } from 'node:path'
import { HOTKEYS } from '../shared/ipc'
import { copyHoveredItem } from './clipboard'
import { GearStore } from './gearStore'
import { Overlay } from './overlay'

const FOCUS_RETURN_MS = 60

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let tray: Tray | null = null

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  void app.whenReady().then(start)
}

function start(): void {
  const overlay = new Overlay()
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
      overlay.show({ text, capturedAt: Date.now(), gear: gearStore.current, equippedTo })
    } finally {
      busy = false
    }
  }

  const failed = Object.values(HOTKEYS).filter(
    (hotkey) => !globalShortcut.register(hotkey, () => void capture(hotkey === HOTKEYS.equip)),
  )

  tray = new Tray(nativeImage.createFromPath(join(__dirname, '../../resources/icon.png')))
  tray.setToolTip(
    failed.length === 0
      ? `PoE Item Checker: hover an item and press ${HOTKEYS.compare}`
      : `PoE Item Checker: ${failed.join(' and ')} taken by another app`,
  )
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `${HOTKEYS.compare}: compare hovered item`, enabled: false },
      { label: `${HOTKEYS.equip}: save hovered item as equipped`, enabled: false },
      { type: 'separator' },
      { label: 'Clear saved gear', click: () => void gearStore.clear() },
      { label: 'Quit', click: () => app.quit() },
    ]),
  )
}

app.on('window-all-closed', () => {})
app.on('will-quit', () => globalShortcut.unregisterAll())
