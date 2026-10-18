import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import {
  characterLabel,
  cleanName,
  cycledCharacter,
  MAX_CHARACTERS,
  nextCharacterId,
  normalizeCharacters,
  type ActiveCharacter,
  type CharacterList,
} from '../shared/characters'
import { jsonFile } from './jsonFile'
import { Listeners } from './listeners'

const FIRST_CHARACTER = '1'

export const characterFile = (base: string, id: string): string =>
  id === FIRST_CHARACTER ? `${base}.json` : `${base}-${id}.json`

export class CharacterStore {
  private readonly file = jsonFile('characters.json')
  private list: CharacterList = normalizeCharacters(this.file.read())
  private readonly listeners = new Listeners()

  get current(): CharacterList {
    return this.list
  }

  get active(): ActiveCharacter {
    return { label: characterLabel(this.list, this.list.active), count: this.list.characters.length }
  }

  fileName(base: string): string {
    return characterFile(base, this.list.active)
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener)
  }

  async add(name: string): Promise<void> {
    if (this.list.characters.length >= MAX_CHARACTERS) return
    const id = nextCharacterId(this.list)
    await this.save({ active: id, characters: [...this.list.characters, { id, name: cleanName(name) }] })
  }

  async rename(id: string, name: string): Promise<void> {
    await this.save({
      ...this.list,
      characters: this.list.characters.map((character) => (character.id === id ? { id, name: cleanName(name) } : character)),
    })
  }

  async select(id: string): Promise<void> {
    if (id === this.list.active || !this.list.characters.some((character) => character.id === id)) return
    await this.save({ ...this.list, active: id })
  }

  cycle(by: number): Promise<void> {
    return this.select(cycledCharacter(this.list, by))
  }

  async remove(id: string): Promise<void> {
    const characters = this.list.characters.filter((character) => character.id !== id)
    if (characters.length === 0 || characters.length === this.list.characters.length) return
    await this.save({ active: this.list.active === id ? characters[0].id : this.list.active, characters })
    const folder = app.getPath('userData')
    await Promise.all(['build', 'gear'].map((base) => rm(join(folder, characterFile(base, id)), { force: true })))
  }

  private async save(list: CharacterList): Promise<void> {
    this.list = list
    try {
      await this.file.write(list)
    } finally {
      this.listeners.notify()
    }
  }
}
