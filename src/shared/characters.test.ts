import { describe, expect, it } from 'vitest'
import {
  characterInLogLine,
  characterLabel,
  cycledCharacter,
  DEFAULT_CHARACTERS,
  nextCharacterId,
  normalizeCharacters,
} from './characters'

const list = {
  active: '1',
  characters: [
    { id: '1', name: 'NaviraMonk' },
    { id: '3', name: 'Arrow_Queen' },
    { id: '4', name: '' },
  ],
}

const line = (text: string) => `2026/10/18 13:20:01 123456789 cff94598 [INFO Client 4120] ${text}`

describe('characters', () => {
  it('cleans saved characters and keeps a valid active one', () => {
    expect(normalizeCharacters(null)).toEqual(DEFAULT_CHARACTERS)
    expect(
      normalizeCharacters({
        active: 'gone',
        characters: [{ id: '2', name: '  Sparky  ' }, { id: '2', name: 'Copy' }, { id: 5 }],
      }),
    ).toEqual({ active: '2', characters: [{ id: '2', name: 'Sparky' }] })
  })

  it('labels unnamed characters by position and cycles both ways', () => {
    expect(characterLabel(list, '4')).toBe('Character 3')
    expect(characterLabel(list, '3')).toBe('Arrow_Queen')
    expect(cycledCharacter(list, 1)).toBe('3')
    expect(cycledCharacter(list, -1)).toBe('4')
    expect(nextCharacterId(list)).toBe('5')
  })

  it('spots a saved character in level ups, deaths and its own chat', () => {
    expect(characterInLogLine(line(': Arrow_Queen (Deadeye) is now level 61'), list)).toBe('3')
    expect(characterInLogLine(line(': naviramonk has been slain.'), list)).toBe('1')
    expect(characterInLogLine(line('#Arrow_Queen: anyone selling exalts?'), list)).toBe('3')
    expect(characterInLogLine(line('&<DIVN> NaviraMonk: brb'), list)).toBe('1')
  })

  it('ignores whispers, other players and unrelated lines', () => {
    expect(characterInLogLine(line('@To Arrow_Queen: hi'), list)).toBeUndefined()
    expect(characterInLogLine(line('@From NaviraMonk: hi'), list)).toBeUndefined()
    expect(characterInLogLine(line('#SomeoneElse: Arrow_Queen is great'), list)).toBeUndefined()
    expect(characterInLogLine(line(': SomeoneElse (Monk) is now level 3'), list)).toBeUndefined()
    expect(characterInLogLine(line(': You have entered Clearfell.'), list)).toBeUndefined()
  })
})
