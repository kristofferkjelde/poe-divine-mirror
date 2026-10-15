import { app, globalShortcut, Menu, nativeImage, Tray } from 'electron'
import { join } from 'node:path'
import { copyHoveredItem } from './clipboard'
import { Overlay } from './overlay'

const COMPARE_HOTKEY = 'Alt+D'
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
  let busy = false

  const registered = globalShortcut.register(COMPARE_HOTKEY, async () => {
    if (busy) return
    busy = true
    try {
      if (overlay.hide()) await delay(FOCUS_RETURN_MS)
      const text = await copyHoveredItem()
      if (text) overlay.show({ text, capturedAt: Date.now() })
    } finally {
      busy = false
    }
  })

  tray = new Tray(nativeImage.createFromPath(join(__dirname, '../../resources/icon.png')))
  tray.setToolTip(
    registered
      ? `PoE Item Checker: hover an item and press ${COMPARE_HOTKEY}`
      : `PoE Item Checker: ${COMPARE_HOTKEY} is taken by another app`,
  )
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Hover an item and press ${COMPARE_HOTKEY}`, enabled: false },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  )
}

app.on('window-all-closed', () => {})
app.on('will-quit', () => globalShortcut.unregisterAll())
