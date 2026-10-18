import { describe, expect, it } from 'vitest'
import { baseTypeNames, magicBaseType } from './baseTypes'

const TYPES = ['Iron Ring', 'Ring', 'Sapphire Ring', 'Soaring Spear', 'Spear', 'Expert Iron Ring']

describe('base types', () => {
  it('reads the base type names from the trade item data', () => {
    const body = {
      result: [
        { id: 'accessory', entries: [{ type: 'Iron Ring' }, { name: 'Blackheart', type: 'Iron Ring', flags: { unique: true } }] },
        { id: 'weapon', entries: [{ type: 'Soaring Spear' }, { text: 'no type' }] },
      ],
    }
    expect(baseTypeNames(body)).toEqual(['Iron Ring', 'Soaring Spear'])
    expect(() => baseTypeNames(null)).toThrow('The trade site sent unexpected item data')
  })

  it('finds the base type inside a magic item name', () => {
    expect(magicBaseType("Dancer's Iron Ring of the Flatworm", TYPES)).toBe('Iron Ring')
    expect(magicBaseType('Expert Iron Ring of Skill', TYPES)).toBe('Expert Iron Ring')
    expect(magicBaseType('Sapphire Ring', TYPES)).toBe('Sapphire Ring')
    expect(magicBaseType('Glinting Soaring Spear', TYPES)).toBe('Soaring Spear')
    expect(magicBaseType('Ringleader Amulet', TYPES)).toBeUndefined()
  })
})
