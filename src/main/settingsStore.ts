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

  onChange(listener: () => void): void {
    this.listeners.add(listener)
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
