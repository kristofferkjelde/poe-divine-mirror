import { isBuildProfile, type BuildProfile } from '../shared/build/profile'
import { refreshProfile } from './buildImport'
import { jsonFile } from './jsonFile'

export class BuildStore {
  private readonly file = jsonFile('build.json')
  private profile: BuildProfile | null = this.load()

  get current(): BuildProfile | null {
    return this.profile
  }

  async set(profile: BuildProfile | null): Promise<void> {
    this.profile = profile
    await this.file.write(profile)
  }

  async setWeight(stat: string, weight: number | null): Promise<void> {
    if (!this.profile) return
    const { [stat]: _removed, ...custom } = this.profile.custom
    await this.set({ ...this.profile, custom: weight === null ? custom : { ...custom, [stat]: weight } })
  }

  private load(): BuildProfile | null {
    const data = this.file.read()
    if (!isBuildProfile(data)) return null
    const profile = refreshProfile(data)
    if (profile !== data) void this.file.write(profile)
    return profile
  }
}
