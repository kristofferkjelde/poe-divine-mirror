import { normalizeSettings, type Settings } from '../shared/settings'
import { jsonFile } from './jsonFile'

export class SettingsStore {
  private readonly file = jsonFile('settings.json')
  private settings: Settings = normalizeSettings(this.file.read())
  private readonly listeners = new Set<() => void>()

  get current(): Settings {
    return this.settings
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener)
  }

  async update(patch: Partial<Settings>): Promise<void> {
    this.settings = { ...this.settings, ...patch }
    this.listeners.forEach((listener) => listener())
    await this.file.write(this.settings)
  }
}
