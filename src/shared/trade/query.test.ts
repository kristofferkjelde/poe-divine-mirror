import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseItem } from '../item/parse'
import { pseudoTotals } from './pseudo'
import {
  applyEdit,
  defaultSearch,
  matchStat,
  PriceCheckUnsupported,
  toSearchEdit,
  toTradeQuery,
  withScale,
  type TradeStatGroup,
} from './query'

const stats = (JSON.parse(readFileSync(new URL('./__fixtures__/stats.json', import.meta.url), 'utf8')) as { result: TradeStatGroup[] }).result
const fixture = (name: string) =>
  parseItem(readFileSync(new URL(`../item/__fixtures__/${name}.txt`, import.meta.url), 'utf8'))
const byLabel = (search: ReturnType<typeof defaultSearch>, label: string) =>
  search.filters.find((filter) => filter.label === label)

describe('defaultSearch', () => {
  it('turns a rare ring into toggleable mod filters at the exact rolls', () => {
    const search = defaultSearch(fixture('rare-ring-advanced'), stats)

    expect(search).toMatchObject({ type: 'Iron Ring', rarity: 'rare', corrupted: 'any', status: 'securable', scale: 0 })
    expect(byLabel(search, '+28 total maximum Life')).toMatchObject({
      kind: 'pseudo',
      enabled: true,
      value: 28,
      statId: 'pseudo.pseudo_total_life',
    })
    expect(byLabel(search, '+28 to maximum Life')).toMatchObject({
      enabled: false,
      value: 28,
      min: 28,
      statId: 'explicit.stat_3299347043',
      affix: 'prefix',
      tier: 5,
    })
    expect(byLabel(search, 'Adds 3 to 7 Physical Damage to Attacks')).toMatchObject({ enabled: true, value: 5, min: 5 })
    expect(byLabel(search, 'Adds 1 to 4 Physical Damage to Attacks')).toMatchObject({ enabled: false, modType: 'implicit', statId: 'implicit.stat_3032590688' })
    expect(byLabel(search, 'Item Level')).toMatchObject({ enabled: false, value: 47 })
  })

  it('searches weapons by DPS and leaves the local damage mods off', () => {
    const search = defaultSearch(fixture('rare-spear'), stats)

    expect(byLabel(search, 'DPS (at 20% quality)')).toMatchObject({
      enabled: true,
      value: 52.2,
      target: { group: 'equipment_filters', filter: 'dps' },
    })
    expect(byLabel(search, 'Adds 5 to 9 Physical Damage')).toMatchObject({ enabled: false, statId: 'explicit.stat_1940865751' })
    expect(byLabel(search, '12% increased Attack Speed')).toMatchObject({ enabled: false, statId: 'explicit.stat_210067635' })
    expect(byLabel(search, '+31 to Accuracy Rating')).toMatchObject({ enabled: true })
    expect(search.corrupted).toBe('yes')
  })

  it('searches rare armour like PoE Overlay: totals, 20% quality defences, no double counting', () => {
    const search = defaultSearch(fixture('rare-boots-advanced'), stats)
    const enabled = search.filters.filter((filter) => filter.enabled).map(({ label, min }) => [label, min])

    expect(search).toMatchObject({ type: 'Wanderer Shoes', rarity: 'rare', corrupted: 'any' })
    expect(enabled).toEqual([
      ['Evasion (at 20% quality)', 183],
      ['Energy Shield (at 20% quality)', 55],
      ['+90 total maximum Mana (54 + 18×2)', 90],
      ['+34% total Elemental Resistance', 34],
      ['+18 total to Attributes', 18],
    ])
    expect(byLabel(search, '30% increased Evasion and Energy Shield')).toMatchObject({ enabled: false })
    expect(byLabel(search, '+59 to Stun Threshold')).toMatchObject({ enabled: false })
    expect(toTradeQuery(search).query.stats[0].filters.map(({ id }) => id)).toEqual([
      'pseudo.pseudo_total_mana',
      'pseudo.pseudo_total_elemental_resistance',
      'pseudo.pseudo_total_attributes',
    ])
  })

  it('shows how a total is made up, counting all elemental resistances three times like the trade site', () => {
    const totals = pseudoTotals([{ index: 0, template: '+#% to all Elemental Resistances', value: 8 }], stats)
    expect(totals).toMatchObject([{ label: '+24% total Elemental Resistance (8×3)', value: 24, statId: 'pseudo.pseudo_total_elemental_resistance' }])
  })

  it('searches uniques by name with their mods off', () => {
    const boots = fixture('unique-boots')
    const search = defaultSearch(boots, stats)
    expect(search).toMatchObject({ name: boots.name, type: boots.baseType, rarity: 'unique' })
    expect(search.filters.every((filter) => !filter.enabled)).toBe(true)
  })

  it('prices normal items as crafting bases by item level', () => {
    const base = parseItem('Item Class: Rings\nRarity: Normal\nIron Ring\n--------\nItem Level: 82\n--------\nAdds 1 to 4 Physical Damage to Attacks (implicit)')
    const search = defaultSearch(base, stats)
    expect(search.rarity).toBe('normal')
    expect(byLabel(search, 'Item Level')).toMatchObject({ enabled: true, min: 82 })
  })

  it('keeps mods the trade site has no stat for, but not searchable', () => {
    const item = parseItem('Item Class: Rings\nRarity: Rare\nX\nIron Ring\n--------\nItem Level: 1\n--------\n+20 to maximum Life\nSomething Unheard Of')
    expect(byLabel(defaultSearch(item, stats), 'Something Unheard Of')).toMatchObject({ kind: 'unsearchable', enabled: false })
  })

  it('refuses currency', () => {
    const orb = parseItem('Item Class: Stackable Currency\nRarity: Currency\nExalted Orb\n--------\nStack Size: 1/20')
    expect(() => defaultSearch(orb, stats)).toThrow(PriceCheckUnsupported)
  })
})

describe('toTradeQuery', () => {
  it('sends only the enabled filters with their min and max', () => {
    const search = defaultSearch(fixture('rare-spear'), stats)
    const edited = {
      ...search,
      listed: '3days' as const,
      filters: search.filters.map((filter) =>
        filter.label === '+31 to Accuracy Rating' ? { ...filter, min: 20, max: 40 } : filter,
      ),
    }
    const { query } = toTradeQuery(edited)

    expect(query.status).toEqual({ option: 'securable' })
    expect(query.type).toBe('Hardwood Spear')
    expect(query.stats[0].filters).toEqual([{ id: 'explicit.stat_803737631', value: { min: 20, max: 40 } }])
    expect(query.filters.equipment_filters.filters.dps).toEqual({ min: 52.2 })
    expect(query.filters.misc_filters.filters.corrupted).toEqual({ option: 'true' })
    expect(query.filters.trade_filters.filters.indexed).toEqual({ option: '3days' })
  })

  it('scales every minimum in 5% steps, leaving item level and sockets alone', () => {
    const search = defaultSearch(fixture('rare-ring-advanced'), stats)
    const lower = withScale(search, -10)
    expect(byLabel(lower, '+28 to maximum Life')?.min).toBe(25)
    expect(byLabel(lower, 'Item Level')?.min).toBe(47)
    expect(byLabel(withScale(search, 5), '+28 to maximum Life')?.min).toBe(30)
    expect(withScale(search, 7).scale).toBe(5)
    expect(withScale(search, 80).scale).toBe(50)
    expect(byLabel(withScale(lower, 0), '+28 to maximum Life')?.min).toBe(28)
  })
})

describe('applyEdit', () => {
  it('applies the options and filter changes the player can make, and nothing else', () => {
    const search = defaultSearch(fixture('rare-ring-advanced'), stats)
    const edit = toSearchEdit(search)
    const life = byLabel(search, '+28 to maximum Life')!
    const edited = applyEdit(search, {
      options: { ...edit.options, rarity: 'rare', status: 'weird' },
      filters: {
        ...edit.filters,
        [life.key]: { enabled: false, min: 20, max: 'lots' },
        forged: { enabled: true, min: 1, max: null },
      },
      statId: 'explicit.stat_1"}',
    })

    expect(edited).toMatchObject({ rarity: 'rare', status: 'securable', type: 'Iron Ring' })
    expect(byLabel(edited, '+28 to maximum Life')).toMatchObject({ enabled: false, min: 20, max: null, statId: life.kind === 'mod' && life.statId })
    expect(edited.filters.map((filter) => filter.key)).toEqual(search.filters.map((filter) => filter.key))
    expect(applyEdit(search, null)).toEqual(search)
  })
})

describe('matchStat', () => {
  it('turns reduced into a negative increased value', () => {
    const [mod] = parseItem('Item Class: Rings\nRarity: Rare\nX\nIron Ring\n--------\nItem Level: 1\n--------\n8% reduced Cast Speed').mods
    expect(matchStat(mod, stats)).toEqual({ id: 'explicit.stat_2891184298', value: -8 })
  })
})
