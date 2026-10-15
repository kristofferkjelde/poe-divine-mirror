import { clipboard } from 'electron'
import { UiohookKey, uIOhook } from 'uiohook-napi'
import { copyKeys, heldModifiers, type Modifier } from '../shared/accelerator'

const POLL_INTERVAL_MS = 16
const TIMEOUT_MS = 1200
const KEY_GAP_MS = 15
const KEY_HOLD_MS = 40

const KEYS: Record<Modifier, number> = {
  Ctrl: UiohookKey.Ctrl,
  Alt: UiohookKey.Alt,
  Shift: UiohookKey.Shift,
  Meta: UiohookKey.Meta,
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isItemText = (text: string) => text.startsWith('Item Class:') || text.startsWith('Rarity:')

async function pressCopy(accelerator: string): Promise<void> {
  const { release, press } = copyKeys(heldModifiers(accelerator))
  for (const modifier of release) uIOhook.keyToggle(KEYS[modifier], 'up')
  for (const modifier of press) uIOhook.keyToggle(KEYS[modifier], 'down')
  try {
    await delay(KEY_GAP_MS)
    uIOhook.keyToggle(UiohookKey.C, 'down')
    await delay(KEY_HOLD_MS)
    uIOhook.keyToggle(UiohookKey.C, 'up')
    await delay(KEY_GAP_MS)
  } finally {
    for (const modifier of press.toReversed()) uIOhook.keyToggle(KEYS[modifier], 'up')
  }
}

export async function copyHoveredItem(accelerator: string): Promise<string | null> {
  const previous = await clipboard.readText()
  await clipboard.writeText('')
  try {
    await pressCopy(accelerator)
    for (let waited = 0; waited < TIMEOUT_MS; waited += POLL_INTERVAL_MS) {
      const text = await clipboard.readText()
      if (isItemText(text)) return text
      await delay(POLL_INTERVAL_MS)
    }
    return null
  } finally {
    await clipboard.writeText(previous)
  }
}
