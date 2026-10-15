import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseItem } from '../item/parse'
import { buildSearch, matchStat, PriceCheckUnsupported, type TradeStatGroup } from './query'

const stats = (JSON.parse(readFileSync(new URL('./__fixtures__/stats.json', import.meta.url), 'utf8')) as { result: TradeStatGroup[] }).result
const fixture = (name: string) =>
  parseItem(readFileSync(new URL(`../item/__fixtures__/${name}.txt`, import.meta.url), 'utf8'))

describe('buildSearch', () => {
  it('searches a rare ring by base type and its explicit mods at 80% of the rolls', () => {
    const plan = buildSearch(fixture('rare-ring-advanced'), stats)

    expect(plan.query.query.type).toBe('Iron Ring')
    expect(plan.query.query.name).toBeUndefined()
    expect(plan.query.query.filters.type_filters.filters.rarity).toEqual({ option: 'nonunique' })
    expect(plan.query.query.stats).toEqual([
      {
        type: 'and',
        filters: [
          { id: 'explicit.stat_3299347043', value: { min: 22 } },
          { id: 'explicit.stat_3032590688', value: { min: 4 } },
          { id: 'explicit.stat_3372524247', value: { min: 14 } },
        ],
      },
    ])
    expect(plan.unmatched).toEqual([])
  })

  it('picks the local version of weapon mods', () => {
    const plan = buildSearch(fixture('rare-spear'), stats)
    expect(plan.query.query.stats[0].filters.map((filter) => filter.id)).toEqual([
      'explicit.stat_1940865751',
      'explicit.stat_210067635',
      'explicit.stat_803737631',
    ])
  })

  it('lets one mod miss when relaxed', () => {
    const plan = buildSearch(fixture('rare-ring-advanced'), stats, true)
    expect(plan.relaxed).toBe(true)
    expect(plan.query.query.stats[0]).toMatchObject({ type: 'count', value: { min: 2 } })
  })

  it('searches uniques by name and base without mods', () => {
    const plan = buildSearch(fixture('unique-boots'), stats)
    const boots = fixture('unique-boots')
    expect(plan.query.query).toMatchObject({ name: boots.name, type: boots.baseType })
    expect(plan.query.query.filters.type_filters.filters.rarity).toEqual({ option: 'unique' })
    expect(plan.query.query.stats[0].filters).toEqual([])
  })

  it('refuses currency', () => {
    const orb = parseItem('Item Class: Stackable Currency\nRarity: Currency\nExalted Orb\n--------\nStack Size: 1/20')
    expect(() => buildSearch(orb, stats)).toThrow(PriceCheckUnsupported)
  })
})

describe('matchStat', () => {
  it('turns reduced into a negative increased value', () => {
    const [mod] = parseItem('Item Class: Rings\nRarity: Rare\nX\nIron Ring\n--------\nItem Level: 1\n--------\n8% reduced Cast Speed').mods
    expect(matchStat(mod, stats)).toEqual({ id: 'explicit.stat_2891184298', value: -8 })
  })

  it('reports mods the trade site has no stat for', () => {
    const item = parseItem('Item Class: Rings\nRarity: Rare\nX\nIron Ring\n--------\nItem Level: 1\n--------\n+20 to maximum Life\nSomething Unheard Of')
    expect(buildSearch(item, stats).unmatched).toEqual(['Something Unheard Of'])
  })
})
