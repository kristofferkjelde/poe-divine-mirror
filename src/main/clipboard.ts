import { clipboard } from 'electron'
import { UiohookKey, uIOhook } from 'uiohook-napi'

const POLL_INTERVAL_MS = 16
const TIMEOUT_MS = 500

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isItemText = (text: string) => text.startsWith('Item Class:') || text.startsWith('Rarity:')

export async function copyHoveredItem(): Promise<string | null> {
  const previous = await clipboard.readText()
  await clipboard.writeText('')

  uIOhook.keyToggle(UiohookKey.Shift, 'up')
  uIOhook.keyTap(UiohookKey.C, [UiohookKey.Ctrl, UiohookKey.Alt])

  try {
    for (let waited = 0; waited < TIMEOUT_MS; waited += POLL_INTERVAL_MS) {
      await delay(POLL_INTERVAL_MS)
      const text = await clipboard.readText()
      if (isItemText(text)) return text
    }
    return null
  } finally {
    await clipboard.writeText(previous)
  }
}
