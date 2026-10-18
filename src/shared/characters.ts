export interface Character {
  id: string
  name: string
}

export interface CharacterList {
  active: string
  characters: Character[]
}

export interface ActiveCharacter {
  label: string
  count: number
}

export const MAX_CHARACTERS = 50
export const MAX_NAME_LENGTH = 40

export const DEFAULT_CHARACTERS: CharacterList = { active: '1', characters: [{ id: '1', name: '' }] }

export const characterLabel = (list: CharacterList, id: string): string => {
  const index = list.characters.findIndex((character) => character.id === id)
  return list.characters[index]?.name || `Character ${index + 1}`
}

export const cleanName = (name: string): string => name.trim().slice(0, MAX_NAME_LENGTH)

const isCharacter = (value: unknown): value is Character =>
  typeof (value as Character | null)?.id === 'string' && typeof (value as Character).name === 'string'

export function normalizeCharacters(value: unknown): CharacterList {
  const input = value as Partial<CharacterList> | null
  const characters = Array.isArray(input?.characters)
    ? input.characters
        .filter(isCharacter)
        .filter((character, index, all) => all.findIndex(({ id }) => id === character.id) === index)
        .slice(0, MAX_CHARACTERS)
        .map(({ id, name }) => ({ id, name: cleanName(name) }))
    : []
  if (characters.length === 0) return DEFAULT_CHARACTERS
  const active = characters.some(({ id }) => id === input?.active) ? (input?.active as string) : characters[0].id
  return { active, characters }
}

export function nextCharacterId(list: CharacterList): string {
  const highest = Math.max(0, ...list.characters.map(({ id }) => Number(id)).filter(Number.isFinite))
  return String(highest + 1)
}

export function cycledCharacter(list: CharacterList, by: number): string {
  const index = list.characters.findIndex(({ id }) => id === list.active)
  const count = list.characters.length
  return list.characters[(((index + by) % count) + count) % count].id
}

const NAMED_LINES = [
  /\] : (\S+) \([^)]+\) is now level \d+\s*$/,
  /\] : (\S+) has been slain\.\s*$/,
  /\] [#$&%](?:<[^>]*> )?([^\s:@<>]+): /,
]

export function characterInLogLine(line: string, list: CharacterList): string | undefined {
  for (const pattern of NAMED_LINES) {
    const name = pattern.exec(line)?.[1]?.toLowerCase()
    const id = name && list.characters.find((character) => character.name.toLowerCase() === name)?.id
    if (id) return id
  }
  return undefined
}
