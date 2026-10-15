import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseItem } from '../item/parse'
import { compareItems } from './compare'
import { chooseEquipSlot, compareWithGear } from './gear'
import { extractStats } from './stats'

const fixture = (name: string) =>
  parseItem(readFileSync(new URL(`../item/__fixtures__/${name}.txt`, import.meta.url), 'utf8'))

const item = (mods: string[], itemClass = 'Rings', extra = '') =>
  parseItem(
    [`Item Class: ${itemClass}`, 'Rarity: Rare', 'Test Loop', 'Iron Ring', extra, '--------', 'Item Level: 80', '--------', ...mods]
      .filter(Boolean)
      .join('\n'),
  )

describe('extractStats', () => {
  it('computes weapon DPS from properties and ignores local weapon mods', () => {
    const stats = extractStats(fixture('unique-spear-ingame'))

    expect(stats.get('Physical DPS')?.value).toBeCloseTo(((37 + 96) / 2) * 1.55)
    expect(stats.get('Total DPS')?.value).toBeCloseTo(103.075)
    expect(stats.get('Critical Hit Chance')?.value).toBe(10.84)
    expect(stats.has('Adds # to # Physical Damage')).toBe(false)
    expect(stats.has('+#% to Critical Hit Chance')).toBe(false)
    expect(stats.get('+# to Intelligence')?.value).toBe(22)
  })

  it('counts "1 or 194" damage from min-or-max uniques as its average', () => {
    const stats = extractStats(fixture('unique-spear-min-max'))

    expect(stats.get('Elemental DPS')?.value).toBeCloseTo(97.5 * 2.11)
    expect(stats.get('Total DPS')?.value).toBeCloseTo(97.5 * 2.11)
    expect(stats.has('Adds # to # Lightning Damage')).toBe(false)
  })

  it('ignores "Can roll ... modifiers" notes on bases', () => {
    const base = item(['Can roll Destruction modifiers', '+20 to maximum Life'], 'Spears')
    expect(base.mods.map((mod) => mod.text)).toEqual(['+20 to maximum Life'])
  })

  it('ignores local defence mods on armour because the property already includes them', () => {
    const stats = extractStats(fixture('rare-body-armour'))

    expect(stats.get('Armour')?.value).toBe(512)
    expect(stats.has('#% increased Armour')).toBe(false)
  })

  it('splits multi-element resistances and turns reduced into negative increased', () => {
    const stats = extractStats(
      item(['+10% to all Elemental Resistances', '+12% to Fire and Cold Resistances', '8% reduced Attack Speed']),
    )

    expect(stats.get('+#% to Fire Resistance')?.value).toBe(22)
    expect(stats.get('+#% to Cold Resistance')?.value).toBe(22)
    expect(stats.get('+#% to Lightning Resistance')?.value).toBe(10)
    expect(stats.get('#% increased Attack Speed')?.value).toBe(-8)
  })

  it('adds up flat damage ranges from implicit and explicit mods', () => {
    const stats = extractStats(fixture('rare-ring-advanced'))
    expect(stats.get('Adds # to # Physical Damage to Attacks')).toEqual({ value: 7.5, display: '4–11', range: [4, 11] })
  })
})

describe('compareItems', () => {
  it('scores more life and resistances as an upgrade', () => {
    const equipped = item(['+40 to maximum Life', '+20% to Fire Resistance'])
    const candidate = item(['+70 to maximum Life', '+20% to Fire Resistance', '+15% to Cold Resistance'])

    const result = compareItems(candidate, equipped)

    expect(result.verdict).toBe('upgrade')
    expect(result.score).toBeCloseTo(30 + 15 * 1.5)
    expect(result.rows.map((row) => [row.stat, row.deltaDisplay])).toEqual([
      ['+# to maximum Life', '+30'],
      ['+#% to Cold Resistance', '+15'],
    ])
  })

  it('calls losing stats a downgrade and lists unscored stats last', () => {
    const equipped = item(['+60 to maximum Life', 'Cannot be Frozen'])
    const candidate = item(['+20 to maximum Life', '+3 to Something Unknown'])

    const result = compareItems(candidate, equipped)

    expect(result.verdict).toBe('downgrade')
    expect(result.rows[0]).toMatchObject({ stat: '+# to maximum Life', deltaDisplay: '-40' })
    expect(result.rows.slice(1).map((row) => row.deltaDisplay).sort()).toEqual(['+3', 'Lost'])
  })

  it('treats near-identical items as a sidegrade', () => {
    const result = compareItems(item(['+41 to maximum Life']), item(['+40 to maximum Life']))
    expect(result.verdict).toBe('sidegrade')
  })
})

describe('gear', () => {
  const weak = item(['+10 to maximum Life'])
  const strong = item(['+90 to maximum Life'])
  const candidate = item(['+50 to maximum Life'])

  it('compares a ring against the weaker of the two equipped rings', () => {
    const result = compareWithGear(candidate, { ring1: strong, ring2: weak })
    expect(result?.slot).toBe('ring2')
    expect(result?.comparison.verdict).toBe('upgrade')
  })

  it('returns null when nothing is equipped in that slot', () => {
    expect(compareWithGear(candidate, { helmet: strong })).toBeNull()
  })

  it('fills an empty ring slot first, then replaces the weaker ring', () => {
    expect(chooseEquipSlot(candidate, {})).toBe('ring1')
    expect(chooseEquipSlot(candidate, { ring1: strong })).toBe('ring2')
    expect(chooseEquipSlot(candidate, { ring1: weak, ring2: strong })).toBe('ring1')
    expect(chooseEquipSlot(strong, { ring1: weak, ring2: strong })).toBe('ring2')
  })

  it('uses the single slot for other item classes', () => {
    expect(chooseEquipSlot(fixture('unique-boots'), {})).toBe('boots')
    expect(chooseEquipSlot(fixture('unique-spear-ingame'), {})).toBe('weapon')
  })
})
