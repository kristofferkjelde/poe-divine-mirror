import { describe, expect, it } from 'vitest'
import { stripMarkup, toListedItem } from './listedItem'

describe('listed trade items', () => {
  it('strips the trade site markup from text', () => {
    expect(stripMarkup('+51 to [Accuracy|Accuracy Rating]')).toBe('+51 to Accuracy Rating')
    expect(stripMarkup('[Quality]')).toBe('Quality')
  })

  it('shows mod tiers and DPS from the extended data', () => {
    const item = toListedItem({
      rarity: 'Rare',
      name: 'Beast Edge',
      typeLine: 'Soaring Spear',
      explicitMods: ['+51 to [Accuracy|Accuracy Rating]', '9% increased Attack Speed', 'Crafted line'],
      extended: {
        dps: 296.04,
        pdps: 296.04,
        edps: 0,
        mods: { explicit: [{ name: 'of the Ranger', tier: 'S7' }, { name: 'Precise', tier: 'P8' }] },
        hashes: { explicit: [['explicit.stat_1', [1]], ['explicit.stat_2', [0]], ['explicit.stat_3', null]] },
      },
    })
    expect(item?.mods.map(({ affix, tier, affixName }) => ({ affix, tier, affixName }))).toEqual([
      { affix: 'prefix', tier: 8, affixName: 'Precise' },
      { affix: 'suffix', tier: 7, affixName: 'of the Ranger' },
      { affix: undefined, tier: undefined, affixName: undefined },
    ])
    expect(item?.properties).toEqual([
      { name: 'DPS', value: '296.0', augmented: false },
      { name: 'Physical DPS', value: '296.0', augmented: false },
    ])
  })

  it('reads mods sent as objects with their own tiers, and granted skills', () => {
    const item = toListedItem({
      rarity: 'Rare',
      name: 'Rune Edge',
      typeLine: 'Soaring Spear',
      grantedSkills: [{ name: 'Grants Skill', values: [['[SpearThrow|Spear Throw]', 0]], displayMode: 0 }],
      runeMods: ['Adds 2 to 4 [Fire|Fire] Damage'],
      explicitMods: [
        { description: 'Adds 83 to 104 [Fire|Fire] Damage', mods: [{ name: 'Blasting', tier: 'P2' }] },
        { description: '+3 to Level of all [Projectile|Projectile] Skills', mods: [{ name: 'of the Sniper', tier: 'S1' }] },
        { hash: 'no text' },
      ],
    })
    expect(item?.mods.map(({ text, type, affix, tier }) => ({ text, type, affix, tier }))).toEqual([
      { text: 'Adds 2 to 4 Fire Damage', type: 'rune', affix: undefined, tier: undefined },
      { text: 'Adds 83 to 104 Fire Damage', type: 'explicit', affix: 'prefix', tier: 2 },
      { text: '+3 to Level of all Projectile Skills', type: 'explicit', affix: 'suffix', tier: 1 },
    ])
    expect(item?.properties).toContainEqual({ name: 'Grants Skill', value: 'Spear Throw', augmented: false })
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
