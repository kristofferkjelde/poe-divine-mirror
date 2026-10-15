import { isStoredProfile, type BuildProfile } from '../shared/build/profile'
import { refreshProfile } from './buildImport'
import { jsonFile } from './jsonFile'
import { Listeners } from './listeners'

export class BuildStore {
  private readonly file = jsonFile('build.json')
  private profile: BuildProfile | null = this.load()
  private readonly listeners = new Listeners()

  get current(): BuildProfile | null {
    return this.profile
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener)
  }

  async set(profile: BuildProfile | null): Promise<void> {
    this.profile = profile
    try {
      await this.file.write(profile)
    } finally {
      this.listeners.notify()
    }
  }

  async setWeight(stat: string, weight: number | null): Promise<void> {
    if (!this.profile) return
    const { [stat]: _removed, ...custom } = this.profile.custom
    await this.set({ ...this.profile, custom: weight === null ? custom : { ...custom, [stat]: weight } })
  }

  private load(): BuildProfile | null {
    const data = this.file.read()
    if (!isStoredProfile(data)) return null
    const profile = refreshProfile(data)
    if (profile !== data) void this.file.write(profile)
    return profile
  }
}
