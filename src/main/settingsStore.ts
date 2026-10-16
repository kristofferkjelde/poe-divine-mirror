import { normalizeSettings, type Settings } from '../shared/settings'
import { jsonFile } from './jsonFile'
import { Listeners } from './listeners'

export class SettingsStore {
  private readonly file = jsonFile('settings.json')
  private settings: Settings = normalizeSettings(this.file.read())
  private readonly listeners = new Listeners()

  get current(): Settings {
    return this.settings
  }

  watch<T>(select: (settings: Settings) => T, listener: (value: T) => void): void {
    let last = select(this.settings)
    this.listeners.add(() => {
      const next = select(this.settings)
      if (sameValues(next, last)) return
      last = next
      listener(next)
    })
  }

  async update(patch: Partial<Settings>): Promise<void> {
    this.settings = { ...this.settings, ...patch }
    try {
      await this.file.write(this.settings)
    } finally {
      this.listeners.notify()
    }
  }
}

function sameValues(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
  return Object.is(a, b)
}
