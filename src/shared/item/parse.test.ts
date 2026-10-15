import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ItemParseError, parseItem, parseModLine } from './parse'

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}.txt`, import.meta.url), 'utf8')

describe('parseItem', () => {
  it('parses a rare body armour with properties, requirements, runes and explicits', () => {
    const item = parseItem(fixture('rare-body-armour'))

    expect(item).toMatchObject({
      itemClass: 'Body Armours',
      slot: 'body',
      rarity: 'Rare',
      name: 'Havoc Shell',
      baseType: 'Full Plate',
      itemLevel: 68,
      quality: 20,
      sockets: 'S S',
      requirements: { level: 52, str: 86 },
      corrupted: false,
    })
    expect(item.properties).toContainEqual({ name: 'Armour', value: '512', augmented: true })
    expect(item.mods.map((mod) => [mod.type, mod.template, mod.values])).toEqual([
      ['rune', '+#% to Fire Resistance', [15]],
      ['explicit', '+# to maximum Life', [52]],
      ['explicit', '#% increased Armour', [36]],
      ['explicit', '+#% to Cold Resistance', [18]],
      ['explicit', '+#% to Lightning Resistance', [11]],
      ['explicit', '+#% to Chaos Resistance', [-7]],
    ])
  })

  it('reads tiers, affixes and rolled values from advanced (Ctrl+Alt+C) text', () => {
    const item = parseItem(fixture('rare-ring-advanced'))

    expect(item.slot).toBe('ring')
    expect(item.mods).toEqual([
      {
        text: 'Adds 1 to 4 Physical Damage to Attacks',
        template: 'Adds # to # Physical Damage to Attacks',
        values: [1, 4],
        ranges: [
          [1, 2],
          [3, 5],
        ],
        type: 'implicit',
      },
      {
        text: '+28 to maximum Life',
        template: '+# to maximum Life',
        values: [28],
        ranges: [[25, 34]],
        type: 'explicit',
        affix: 'prefix',
        tier: 5,
        affixName: 'Hale',
      },
      {
        text: 'Adds 3 to 7 Physical Damage to Attacks',
        template: 'Adds # to # Physical Damage to Attacks',
        values: [3, 7],
        ranges: [
          [2, 4],
          [6, 8],
        ],
        type: 'explicit',
        affix: 'prefix',
        tier: 6,
        affixName: 'Glinting',
      },
      {
        text: '+18% to Fire Resistance',
        template: '+#% to Fire Resistance',
        values: [18],
        ranges: [[16, 20]],
        type: 'explicit',
        affix: 'suffix',
        tier: 7,
        affixName: 'of the Whelpling',
      },
    ])
  })

  it('parses weapon category, damage and the corrupted flag', () => {
    const item = parseItem(fixture('rare-spear'))

    expect(item).toMatchObject({
      slot: 'weapon',
      category: 'Spear',
      corrupted: true,
      requirements: { level: 16, str: 18, dex: 31 },
    })
    expect(item.properties).toContainEqual({ name: 'Physical Damage', value: '20-38', augmented: true })
    expect(item.properties).toContainEqual({ name: 'Grants Skill', value: 'Spear Throw', augmented: false })
    expect(item.mods.map((mod) => mod.template)).toEqual([
      'Adds # to # Physical Damage',
      '#% increased Attack Speed',
      '+# to Accuracy Rating',
    ])
  })

  it('skips unique flavour text and keeps the stash note', () => {
    const item = parseItem(fixture('unique-boots'))

    expect(item.rarity).toBe('Unique')
    expect(item.note).toBe('~price 1 exalted')
    expect(item.mods.map((mod) => mod.text)).toEqual([
      '+5 to Dexterity',
      '10% increased Mana Regeneration Rate',
      '20% increased Movement Speed',
      'Cannot be Frozen',
    ])
  })

  it('handles magic items without a separate base type line', () => {
    const item = parseItem(fixture('magic-belt'))

    expect(item).toMatchObject({ rarity: 'Magic', name: 'Heavy Belt of the Bear', baseType: undefined, slot: 'belt' })
    expect(item.mods[0]).toMatchObject({ type: 'implicit', values: [0.17] })
  })

  it('accepts Windows line endings', () => {
    const item = parseItem(fixture('rare-body-armour').replace(/\n/g, '\r\n'))
    expect(item.mods).toHaveLength(6)
  })

  it('rejects text that is not an item', () => {
    expect(() => parseItem('hello world')).toThrow(ItemParseError)
    expect(() => parseItem('')).toThrow(ItemParseError)
  })
})

describe('parseModLine', () => {
  it('keeps negative rolls and ranges', () => {
    expect(parseModLine('-12(-15--10)% to Cold Resistance')).toEqual({
      text: '-12% to Cold Resistance',
      template: '+#% to Cold Resistance',
      values: [-12],
      ranges: [[-15, -10]],
      type: 'explicit',
    })
  })
})
