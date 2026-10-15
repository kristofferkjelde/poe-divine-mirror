import type { Mod, ModType, ParsedItem } from '../item/types'
import { isLocal } from '../compare/stats'

export interface TradeStatEntry {
  id: string
  text: string
  type: string
  option?: unknown
}

export interface TradeStatGroup {
  id: string
  label: string
  entries: TradeStatEntry[]
}

export interface StatFilter {
  id: string
  value?: { min: number }
}

export interface TradeQuery {
  query: {
    status: { option: 'online' }
    name?: string
    type?: string
    stats: Array<{ type: 'and' | 'count'; filters: StatFilter[]; value?: { min: number } }>
    filters: { type_filters: { filters: Record<string, { option: string }> } }
  }
  sort: { price: 'asc' }
}

export interface SearchPlan {
  query: TradeQuery
  matched: string[]
  unmatched: string[]
  relaxed: boolean
}

export class PriceCheckUnsupported extends Error {}

export const ROLL_MATCH = 0.8

const SEARCHED_TYPES: ReadonlySet<ModType> = new Set(['explicit', 'fractured', 'desecrated'])

const GROUPS: Partial<Record<ModType, string[]>> = {
  explicit: ['explicit'],
  fractured: ['fractured', 'explicit'],
  desecrated: ['desecrated', 'explicit'],
}

const CATEGORIES: Record<string, string> = {
  Claws: 'weapon.claw',
  Daggers: 'weapon.dagger',
  Wands: 'weapon.wand',
  'One Hand Swords': 'weapon.onesword',
  'One Hand Axes': 'weapon.oneaxe',
  'One Hand Maces': 'weapon.onemace',
  Sceptres: 'weapon.sceptre',
  Spears: 'weapon.spear',
  Flails: 'weapon.flail',
  Bows: 'weapon.bow',
  Staves: 'weapon.staff',
  'Two Hand Swords': 'weapon.twosword',
  'Two Hand Axes': 'weapon.twoaxe',
  'Two Hand Maces': 'weapon.twomace',
  Quarterstaves: 'weapon.warstaff',
  Crossbows: 'weapon.crossbow',
  Shields: 'armour.shield',
  Bucklers: 'armour.buckler',
  Foci: 'armour.focus',
  Quivers: 'armour.quiver',
  Helmets: 'armour.helmet',
  'Body Armours': 'armour.chest',
  Gloves: 'armour.gloves',
  Boots: 'armour.boots',
  Belts: 'accessory.belt',
  Amulets: 'accessory.amulet',
  Rings: 'accessory.ring',
  Jewels: 'jewel',
}

const FLIPPED: Array<[RegExp, string]> = [
  [/\breduced\b/, 'increased'],
  [/\bincreased\b/, 'reduced'],
  [/\bless\b/, 'more'],
  [/\bmore\b/, 'less'],
]

type StatIndex = Map<string, Map<string, TradeStatEntry[]>>

const indexes = new WeakMap<TradeStatGroup[], StatIndex>()

const normalize = (text: string) =>
  text
    .replace(/\s*\(local\)$/i, '')
    .replace(/\+#/g, '#')
    .toLowerCase()

function indexStats(groups: TradeStatGroup[]): StatIndex {
  const cached = indexes.get(groups)
  if (cached) return cached
  const index: StatIndex = new Map()
  for (const group of groups) {
    const byText = new Map<string, TradeStatEntry[]>()
    for (const entry of group.entries) {
      if (entry.option || entry.text.includes('\n')) continue
      const key = normalize(entry.text)
      byText.set(key, [...(byText.get(key) ?? []), entry])
    }
    index.set(group.id, byText)
  }
  indexes.set(groups, index)
  return index
}

function modValue(mod: Mod): number | undefined {
  if (mod.values.length === 0) return undefined
  if (mod.values.length === 2 && /# to #/.test(mod.template)) return (mod.values[0] + mod.values[1]) / 2
  return mod.values[0]
}

function pick(entries: TradeStatEntry[], local: boolean): TradeStatEntry {
  if (entries.length === 1) return entries[0]
  const isLocalEntry = (entry: TradeStatEntry) => /\(local\)$/i.test(entry.text)
  return entries.find((entry) => isLocalEntry(entry) === local) ?? entries[0]
}

export function matchStat(
  mod: Mod,
  groups: TradeStatGroup[],
  local = false,
): { id: string; value: number | undefined } | null {
  const index = indexStats(groups)
  const value = modValue(mod)
  for (const groupId of GROUPS[mod.type] ?? [mod.type]) {
    const byText = index.get(groupId)
    if (!byText) continue
    const exact = byText.get(normalize(mod.template))
    if (exact) return { id: pick(exact, local).id, value }
    for (const [pattern, replacement] of FLIPPED) {
      if (!pattern.test(mod.template)) continue
      const flipped = byText.get(normalize(mod.template.replace(pattern, replacement)))
      if (flipped) return { id: pick(flipped, local).id, value: value === undefined ? undefined : -value }
    }
  }
  return null
}

const minimumFor = (value: number) =>
  Number.isInteger(value) ? Math.floor(value * ROLL_MATCH) : Math.floor(value * ROLL_MATCH * 10) / 10

export function buildSearch(item: ParsedItem, groups: TradeStatGroup[], relaxed = false): SearchPlan {
  if (item.unidentified && item.rarity !== 'Unique') throw new PriceCheckUnsupported('Identify the item first')
  if (item.rarity === 'Currency' || item.rarity === 'Gem' || item.rarity === 'Unknown') {
    throw new PriceCheckUnsupported('Price check works on gear. Use the currency exchange for this one.')
  }

  const unique = item.rarity === 'Unique'
  const typeFilters: Record<string, { option: string }> = { rarity: { option: unique ? 'unique' : 'nonunique' } }
  const category = CATEGORIES[item.itemClass]
  if (!item.baseType && category) typeFilters.category = { option: category }

  const filters: StatFilter[] = []
  const matched: string[] = []
  const unmatched: string[] = []
  if (!unique) {
    for (const mod of item.mods) {
      if (!SEARCHED_TYPES.has(mod.type)) continue
      const stat = matchStat(mod, groups, isLocal(mod.template, item.slot))
      if (!stat) {
        unmatched.push(mod.text)
        continue
      }
      if (filters.some((filter) => filter.id === stat.id)) continue
      filters.push(stat.value !== undefined && stat.value > 0 ? { id: stat.id, value: { min: minimumFor(stat.value) } } : { id: stat.id })
      matched.push(mod.text)
    }
  }

  const useCount = relaxed && filters.length >= 3
  return {
    query: {
      query: {
        status: { option: 'online' },
        ...(unique ? { name: item.name } : {}),
        ...(item.baseType ? { type: item.baseType } : {}),
        stats: [
          useCount ? { type: 'count', filters, value: { min: filters.length - 1 } } : { type: 'and', filters },
        ],
        filters: { type_filters: { filters: typeFilters } },
      },
      sort: { price: 'asc' },
    },
    matched,
    unmatched,
    relaxed: useCount,
  }
}
