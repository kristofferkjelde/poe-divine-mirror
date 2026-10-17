import { app, BrowserWindow, session, type WebContents } from 'electron'
import { delay } from './delay'

const PARTITION = 'persist:page-reader'
const READ_TIMEOUT_MS = 45_000
const POLL_MS = 500
const STATE_SCRIPT = '(() => { const state = window.__PRELOADED_STATE__; return state ? JSON.stringify(state) : null })()'
const READABLE_HOSTS = /(^|\.)mobalytics\.gg$/

export function isPageReader(contents: WebContents): boolean {
  return contents.session === session.fromPartition(PARTITION)
}

export function mayNavigate(contents: WebContents, url: string): boolean {
  try {
    return isPageReader(contents) && new URL(url).protocol === 'https:' && READABLE_HOSTS.test(new URL(url).hostname)
  } catch {
    return false
  }
}

function browserUserAgent(): string {
  return app.userAgentFallback.replace(/ (?!(?:AppleWebKit|Chrome|Safari)\/)[\w.-]+\/[\w.-]+/g, '')
}

export async function readPageState(url: string): Promise<string> {
  const reader = session.fromPartition(PARTITION)
  reader.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  reader.setPermissionCheckHandler(() => false)
  const window = new BrowserWindow({
    show: false,
    webPreferences: { partition: PARTITION, sandbox: true, backgroundThrottling: false, images: false },
  })
  window.webContents.setAudioMuted(true)
  window.webContents.setUserAgent(browserUserAgent())
  try {
    window.loadURL(url).catch(() => {})
    for (const deadline = Date.now() + READ_TIMEOUT_MS; Date.now() < deadline; ) {
      await delay(POLL_MS)
      const state: unknown = await window.webContents.executeJavaScript(STATE_SCRIPT).catch(() => null)
      if (typeof state === 'string') return state
    }
    throw new Error('The page did not finish loading')
  } finally {
    window.destroy()
  }
}
