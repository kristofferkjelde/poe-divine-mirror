import { app } from 'electron'
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chooseEquipSlot, parseGear } from '../shared/compare/gear'
import type { Gear, GearSlot } from '../shared/gear'
import { parseItem } from '../shared/item/parse'

export class GearStore {
  private readonly file = join(app.getPath('userData'), 'gear.json')
  private gear: Gear = this.load()

  get current(): Gear {
    return { ...this.gear }
  }

  async equip(text: string): Promise<GearSlot | undefined> {
    const item = parseItem(text)
    const slot = chooseEquipSlot(item, parseGear(this.gear))
    if (!slot) return undefined
    this.gear = { ...this.gear, [slot]: text }
    await this.save()
    return slot
  }

  async clear(): Promise<void> {
    this.gear = {}
    await this.save()
  }

  private load(): Gear {
    try {
      const data: unknown = JSON.parse(readFileSync(this.file, 'utf8'))
      return data && typeof data === 'object' ? (data as Gear) : {}
    } catch {
      return {}
    }
  }

  private save(): Promise<void> {
    return writeFile(this.file, JSON.stringify(this.gear, null, 2))
  }
}
