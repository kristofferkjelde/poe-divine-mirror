import { describe, expect, it } from 'vitest'
import { stripMarkup, toListedItem } from './listedItem'

describe('listed trade items', () => {
  it('strips the trade site markup from text', () => {
    expect(stripMarkup('+51 to [Accuracy|Accuracy Rating]')).toBe('+51 to Accuracy Rating')
    expect(stripMarkup('[Quality]')).toBe('Quality')
  })

  it('turns a fetched item into an item card', () => {
    const item = toListedItem({
      rarity: 'Rare',
      name: 'Beast Edge',
      typeLine: 'Soaring Spear',
      ilvl: 82,
      corrupted: true,
      properties: [
        { name: 'Spear', values: [], displayMode: 0 },
        { name: '[Quality]', values: [['+20%', 1]], displayMode: 0 },
        { name: '[Physical|Physical Damage]', values: [['58-108', 1]], displayMode: 0 },
        { name: 'Grants {0} Skill', values: [['Level 18 Whirling Slash', 0]], displayMode: 3 },
      ],
      requirements: [
        { name: 'Level', values: [['77', 0]] },
        { name: '[Dexterity|Dex]', values: [['152', 0]] },
      ],
      runeMods: ['+2 to [Level|Level] of all Projectile Skills'],
      explicitMods: ['+51 to [Accuracy|Accuracy Rating]', '52% increased [Physical] Damage'],
    })
    expect(item).toMatchObject({
      rarity: 'Rare',
      name: 'Beast Edge',
      baseType: 'Soaring Spear',
      category: 'Spear',
      itemLevel: 82,
      corrupted: true,
      requirements: { level: 77, dex: 152 },
      properties: [
        { name: 'Quality', value: '+20%', augmented: true },
        { name: 'Physical Damage', value: '58-108', augmented: true },
        { name: 'Grants Level 18 Whirling Slash Skill', value: '' },
      ],
    })
    expect(item?.mods.map(({ text, type }) => `${type}: ${text}`)).toEqual([
      'rune: +2 to Level of all Projectile Skills',
      'explicit: +51 to Accuracy Rating',
      'explicit: 52% increased Physical Damage',
    ])
  })

  it('names magic and normal items by their type line', () => {
    expect(toListedItem({ frameType: 1, name: '', typeLine: 'Sapphire Ring of the Whelpling' })).toMatchObject({
      rarity: 'Magic',
      name: 'Sapphire Ring of the Whelpling',
      baseType: undefined,
    })
    expect(toListedItem(undefined)).toBeUndefined()
  })
})
