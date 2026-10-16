import { app, clipboard } from 'electron'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { UiohookKey, uIOhook } from 'uiohook-napi'
import { delay } from './delay'

const POLL_INTERVAL_MS = 16
const KEY_GAP_MS = 12
const RETRY_AFTER_MS = 400
const TIMEOUT_MS = 1200

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
  const previous = await clipboard.readText()
  await clipboard.writeText('')
  let text = ''
  let presses = 0
  try {
    while (Date.now() - started < TIMEOUT_MS) {
      if (presses === 0 || (presses === 1 && Date.now() - started >= RETRY_AFTER_MS)) {
        await pressCopy()
        presses++
      }
      await delay(POLL_INTERVAL_MS)
      text = await clipboard.readText()
      if (isItemText(text)) return text
    }
    return null
  } finally {
    await clipboard.writeText(previous)
    void logCapture(Date.now() - started, isItemText(text), text, presses)
  }
}

async function logCapture(ms: number, ok: boolean, text: string, presses: number): Promise<void> {
  const dir = app.getPath('logs')
  const result = ok ? 'copied' : text ? `not an item: ${JSON.stringify(text.slice(0, 40))}` : 'clipboard stayed empty'
  try {
    await mkdir(dir, { recursive: true })
    await appendFile(join(dir, 'capture.log'), `${new Date().toISOString()} ${result} after ${ms}ms (${presses} ${presses === 1 ? 'press' : 'presses'})\n`)
  } catch {}
}
