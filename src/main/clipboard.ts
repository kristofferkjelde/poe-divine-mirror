import { app, clipboard } from 'electron'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { UiohookKey, uIOhook } from 'uiohook-napi'
import { delay } from './delay'

const POLL_INTERVAL_MS = 16
const TIMEOUT_MS = 1200

const isItemText = (text: string) => text.startsWith('Item Class:') || text.startsWith('Rarity:')

export async function copyHoveredItem(): Promise<string | null> {
  const started = Date.now()
  const previous = await clipboard.readText()
  await clipboard.writeText('')
  for (const key of [UiohookKey.Shift, UiohookKey.Meta]) uIOhook.keyToggle(key, 'up')
  uIOhook.keyTap(UiohookKey.C, [UiohookKey.Ctrl, UiohookKey.Alt])
  let text = ''
  try {
    while (Date.now() - started < TIMEOUT_MS) {
      await delay(POLL_INTERVAL_MS)
      text = await clipboard.readText()
      if (isItemText(text)) return text
    }
    return null
  } finally {
    await clipboard.writeText(previous)
    void logCapture(Date.now() - started, isItemText(text), text)
  }
}

async function logCapture(ms: number, ok: boolean, text: string): Promise<void> {
  const dir = app.getPath('logs')
  const result = ok ? 'copied' : text ? `not an item: ${JSON.stringify(text.slice(0, 40))}` : 'clipboard stayed empty'
  try {
    await mkdir(dir, { recursive: true })
    await appendFile(join(dir, 'capture.log'), `${new Date().toISOString()} ${result} after ${ms}ms\n`)
  } catch {}
}
