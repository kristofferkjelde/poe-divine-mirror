import { app, clipboard, ClipboardItem } from 'electron'
import { appendFile, mkdir, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { UiohookKey, uIOhook } from 'uiohook-napi'
import { delay } from './delay'

const POLL_INTERVAL_MS = 16
const KEY_GAP_MS = 12
const RETRY_EVERY_MS = 150
const MAX_PRESSES = 3
const TIMEOUT_MS = 1200
const LOG_MAX_BYTES = 1024 * 1024

const isItemText = (text: string) => text.startsWith('Item Class:') || text.startsWith('Rarity:')

async function pressCopy(): Promise<void> {
  for (const key of [UiohookKey.Shift, UiohookKey.Meta]) uIOhook.keyToggle(key, 'up')
  uIOhook.keyToggle(UiohookKey.Ctrl, 'down')
  uIOhook.keyToggle(UiohookKey.Alt, 'down')
  await delay(KEY_GAP_MS)
  uIOhook.keyToggle(UiohookKey.C, 'down')
  await delay(KEY_GAP_MS)
  uIOhook.keyToggle(UiohookKey.C, 'up')
  await delay(KEY_GAP_MS)
  uIOhook.keyToggle(UiohookKey.Alt, 'up')
  uIOhook.keyToggle(UiohookKey.Ctrl, 'up')
}

export async function copyHoveredItem(): Promise<string | null> {
  const started = Date.now()
  const previous = await saveClipboard()
  await clipboard.writeText('')
  let text = ''
  let presses = 0
  try {
    while (Date.now() - started < TIMEOUT_MS) {
      if (presses === 0 || (presses < MAX_PRESSES && Date.now() - started >= presses * RETRY_EVERY_MS)) {
        await pressCopy()
        presses++
      }
      await delay(POLL_INTERVAL_MS)
      text = await clipboard.readText()
      if (isItemText(text)) return text
    }
    return null
  } finally {
    await restoreClipboard(previous)
    void logCapture(Date.now() - started, isItemText(text), text, presses)
  }
}

interface SavedClipboard {
  text: string
  items: ClipboardItem[]
}

async function saveClipboard(): Promise<SavedClipboard> {
  const text = await clipboard.readText()
  const items = await clipboard.read().then(snapshot, () => [])
  return { text, items }
}

async function snapshot(items: ClipboardItem[]): Promise<ClipboardItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const entries = await Promise.all(
        item.types.map((type) =>
          item.getType(type).then(
            (value) => [[type, value] as const],
            () => [],
          ),
        ),
      )
      return new ClipboardItem(Object.fromEntries(entries.flat()))
    }),
  ).then((saved) => saved.filter((item) => item.types.length > 0))
}

async function restoreClipboard({ text, items }: SavedClipboard): Promise<void> {
  if (items.length > 0) {
    const restored = await clipboard.write(items).then(
      () => true,
      () => false,
    )
    if (restored) return
  }
  await clipboard.writeText(text)
}

async function logCapture(ms: number, ok: boolean, text: string, presses: number): Promise<void> {
  const dir = app.getPath('logs')
  const result = ok ? 'copied' : text ? `not an item: ${JSON.stringify(text.slice(0, 40))}` : 'clipboard stayed empty'
  try {
    await mkdir(dir, { recursive: true })
    const file = join(dir, 'capture.log')
    const { size } = await stat(file).catch(() => ({ size: 0 }))
    if (size > LOG_MAX_BYTES) await rename(file, join(dir, 'capture.old.log'))
    await appendFile(file, `${new Date().toISOString()} ${result} after ${ms}ms (${presses} ${presses === 1 ? 'press' : 'presses'})\n`)
  } catch {}
}
