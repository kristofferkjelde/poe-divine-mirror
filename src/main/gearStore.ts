import { rulesForProfile, type BuildProfile } from '../shared/build/profile'
import { chooseEquipSlot, parseGear } from '../shared/compare/gear'
import type { Gear, GearSlot } from '../shared/gear'
import { parseItem } from '../shared/item/parse'
import { jsonFile } from './jsonFile'

export class GearStore {
  private readonly file = jsonFile('gear.json')
  private gear: Gear = this.load()

  get current(): Gear {
    return { ...this.gear }
  }

  async equip(text: string, build: BuildProfile | null): Promise<GearSlot | undefined> {
    const item = parseItem(text)
    const slot = chooseEquipSlot(item, parseGear(this.gear), rulesForProfile(build))
    if (!slot) return undefined
    this.gear = { ...this.gear, [slot]: text }
    await this.file.write(this.gear)
    return slot
  }

  async forget(slot: GearSlot): Promise<void> {
    const { [slot]: _forgotten, ...rest } = this.gear
    this.gear = rest
    await this.file.write(this.gear)
  }

  async clear(): Promise<void> {
    this.gear = {}
    await this.file.write(this.gear)
  }

  private load(): Gear {
    const data = this.file.read()
    return data && typeof data === 'object' ? (data as Gear) : {}
  }
}
