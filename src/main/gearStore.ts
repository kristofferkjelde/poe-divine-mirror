import { rulesForProfile, type BuildProfile } from '../shared/build/profile'
import { chooseEquipSlot, parseGear } from '../shared/compare/gear'
import { isGear, type Gear, type GearSlot } from '../shared/gear'
import { parseItem } from '../shared/item/parse'
import type { CharacterStore } from './characterStore'
import { jsonFile } from './jsonFile'
import { Listeners } from './listeners'

export class GearStore {
  private fileName: string
  private file: ReturnType<typeof jsonFile>
  private gear: Gear
  private readonly listeners = new Listeners()

  constructor(characters: CharacterStore) {
    this.fileName = characters.fileName('gear')
    this.file = jsonFile(this.fileName)
    this.gear = this.load()
    characters.onChange(() => {
      if (characters.fileName('gear') === this.fileName) return
      this.fileName = characters.fileName('gear')
      this.file = jsonFile(this.fileName)
      this.gear = this.load()
      this.listeners.notify()
    })
  }

  get current(): Gear {
    return { ...this.gear }
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener)
  }

  async equip(text: string, build: BuildProfile | null): Promise<GearSlot | undefined> {
    const item = parseItem(text)
    const slot = chooseEquipSlot(item, parseGear(this.gear), rulesForProfile(build))
    if (!slot) return undefined
    await this.save({ ...this.gear, [slot]: text })
    return slot
  }

  async forget(slot: GearSlot): Promise<void> {
    const { [slot]: _forgotten, ...rest } = this.gear
    await this.save(rest)
  }

  async clear(): Promise<void> {
    await this.save({})
  }

  private async save(gear: Gear): Promise<void> {
    this.gear = gear
    try {
      await this.file.write(gear)
    } finally {
      this.listeners.notify()
    }
  }

  private load(): Gear {
    const data = this.file.read()
    return isGear(data) ? data : {}
  }
}
