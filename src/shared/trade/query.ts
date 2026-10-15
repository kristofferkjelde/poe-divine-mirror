import { DERIVED, extractStats, isLocal } from '../compare/stats'
import type { Mod, ModType, ParsedItem, Slot } from '../item/types'

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

export type SearchMode = 'exact' | 'broad'
export type Corrupted = 'any' | 'yes' | 'no'
export type SearchRarity = 'nonunique' | 'normal' | 'magic' | 'rare' | 'unique'
export type SaleStatus = 'available' | 'securable' | 'online' | 'any'
export type ListedWithin = 'any' | '3hours' | '12hours' | '1day' | '3days' | '1week' | '1month'
export type PriceCurrency = 'any' | 'exalted' | 'divine' | 'chaos'

export const RARITY_OPTIONS: Record<SearchRarity, string> = {
  nonunique: 'Any non-unique',
  normal: 'Normal',
  magic: 'Magic',
  rare: 'Rare',
  unique: 'Unique',
}

export const STATUS_OPTIONS: Record<SaleStatus, string> = {
  available: 'Instant buyout and in person',
  securable: 'Instant buyout only',
  online: 'In person trade only',
  any: 'Any',
}

export const LISTED_OPTIONS: Record<ListedWithin, string> = {
  any: 'Any time',
  '3hours': 'Up to 3 hours ago',
  '12hours': 'Up to 12 hours ago',
  '1day': 'Up to a day ago',
  '3days': 'Up to 3 days ago',
  '1week': 'Up to a week ago',
  '1month': 'Up to a month ago',
}

export const CURRENCY_OPTIONS: Record<PriceCurrency, string> = {
  any: 'Exalted equivalent',
  exalted: 'Exalted Orb',
  divine: 'Divine Orb',
  chaos: 'Chaos Orb',
}

export interface PropertyTarget {
  group: 'type_filters' | 'equipment_filters'
  filter: string
}

export interface SearchFilter {
  key: string
  label: string
  kind: 'property' | 'mod' | 'unsearchable'
  enabled: boolean
  value?: number
  min: number | null
  max: number | null
  target?: PropertyTarget
  statId?: string
  modType?: ModType
}

export interface ItemSearch {
  name?: string
  type?: string
  category?: string
  rarity: SearchRarity
  corrupted: Corrupted
  status: SaleStatus
  listed: ListedWithin
  currency: PriceCurrency
  mode: SearchMode
  filters: SearchFilter[]
}

type Range = { min?: number; max?: number }

export interface TradeQuery {
  query: {
    status: { option: SaleStatus }
    name?: string
    type?: string
    stats: Array<{ type: 'and'; filters: Array<{ id: string; value?: Range }> }>
    filters: Record<string, { filters: Record<string, Range | { option: string }> }>
  }
  sort: { price: 'asc' }
}

export class PriceCheckUnsupported extends Error {}

export const BROAD_MATCH = 0.9

const MOD_TYPES: ReadonlySet<ModType> = new Set(['explicit', 'fractured', 'desecrated', 'implicit', 'rune', 'enchant'])
const ENABLED_TYPES: ReadonlySet<ModType> = new Set(['explicit', 'fractured', 'desecrated'])
const ARMOUR_SLOTS: ReadonlySet<Slot> = new Set(['helmet', 'body', 'gloves', 'boots', 'offhand'])

const GROUPS: Record<ModType, string[]> = {
  explicit: ['explicit'],
  fractured: ['fractured', 'explicit'],
  desecrated: ['desecrated', 'explicit'],
  implicit: ['implicit'],
  rune: ['rune', 'augment'],
  enchant: ['enchant'],
}

const PROPERTIES: Array<{ stat: string; label: string; target: PropertyTarget; enabled: (slot?: Slot) => boolean }> = [
  { stat: DERIVED.totalDps, label: 'DPS', target: { group: 'equipment_filters', filter: 'dps' }, enabled: (slot) => slot === 'weapon' },
  { stat: DERIVED.physicalDps, label: 'Physical DPS', target: { group: 'equipment_filters', filter: 'pdps' }, enabled: () => false },
  { stat: DERIVED.elementalDps, label: 'Elemental DPS', target: { group: 'equipment_filters', filter: 'edps' }, enabled: () => false },
  { stat: DERIVED.criticalHitChance, label: 'Critical Hit Chance', target: { group: 'equipment_filters', filter: 'crit' }, enabled: () => false },
  { stat: DERIVED.attacksPerSecond, label: 'Attacks per Second', target: { group: 'equipment_filters', filter: 'aps' }, enabled: () => false },
  { stat: DERIVED.armour, label: 'Armour', target: { group: 'equipment_filters', filter: 'ar' }, enabled: (slot) => !!slot && ARMOUR_SLOTS.has(slot) },
  { stat: DERIVED.evasion, label: 'Evasion', target: { group: 'equipment_filters', filter: 'ev' }, enabled: (slot) => !!slot && ARMOUR_SLOTS.has(slot) },
  { stat: DERIVED.energyShield, label: 'Energy Shield', target: { group: 'equipment_filters', filter: 'es' }, enabled: (slot) => !!slot && ARMOUR_SLOTS.has(slot) },
  { stat: DERIVED.block, label: 'Block', target: { group: 'equipment_filters', filter: 'block' }, enabled: () => false },
  { stat: DERIVED.spirit, label: 'Spirit', target: { group: 'equipment_filters', filter: 'spirit' }, enabled: () => true },
]

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
  for (const groupId of GROUPS[mod.type]) {
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

export function minimumFor(value: number | undefined, mode: SearchMode): number | null {
  if (value === undefined || value <= 0) return null
  if (mode === 'exact') return value
  const broad = value * BROAD_MATCH
  return Number.isInteger(value) ? Math.floor(broad) : Math.floor(broad * 100) / 100
}

function property(key: string, label: string, value: number, enabled: boolean, target: PropertyTarget, mode: SearchMode): SearchFilter {
  return { key, label, kind: 'property', enabled, value, min: minimumFor(value, mode), max: null, target }
}

export function defaultSearch(item: ParsedItem, groups: TradeStatGroup[], mode: SearchMode = 'broad'): ItemSearch {
  if (item.unidentified && item.rarity !== 'Unique') throw new PriceCheckUnsupported('Identify the item first')
  if (item.rarity === 'Currency' || item.rarity === 'Gem' || item.rarity === 'Unknown') {
    throw new PriceCheckUnsupported('Price check works on gear. Use the currency exchange for this one.')
  }

  const unique = item.rarity === 'Unique'
  const filters: SearchFilter[] = []
  const stats = extractStats(item)

  for (const entry of PROPERTIES) {
    const stat = stats.get(entry.stat)
    if (stat && stat.value > 0) {
      filters.push(property(entry.target.filter, entry.label, stat.value, !unique && entry.enabled(item.slot), entry.target, mode))
    }
  }
  const craftingBase = item.rarity === 'Normal'
  if (item.itemLevel) {
    filters.push({
      ...property('ilvl', 'Item Level', item.itemLevel, craftingBase, { group: 'type_filters', filter: 'ilvl' }, mode),
      ...(craftingBase && { min: item.itemLevel }),
    })
  }
  if (item.quality) {
    filters.push(property('quality', 'Quality', item.quality, false, { group: 'type_filters', filter: 'quality' }, mode))
  }
  const sockets = item.sockets?.split(/\s+/).filter(Boolean).length
  if (sockets) {
    filters.push(property('rune_sockets', 'Rune Sockets', sockets, false, { group: 'equipment_filters', filter: 'rune_sockets' }, 'exact'))
  }

  for (const [index, mod] of item.mods.entries()) {
    if (!MOD_TYPES.has(mod.type)) continue
    const local = isLocal(mod.template, item.slot)
    const stat = matchStat(mod, groups, local)
    const key = `mod-${index}`
    if (!stat) {
      filters.push({ key, label: mod.text, kind: 'unsearchable', enabled: false, min: null, max: null, modType: mod.type })
      continue
    }
    const coveredByProperty = local && (item.slot === 'weapon' || (!!item.slot && ARMOUR_SLOTS.has(item.slot)))
    filters.push({
      key,
      label: mod.text,
      kind: 'mod',
      enabled: !unique && ENABLED_TYPES.has(mod.type) && !coveredByProperty,
      value: stat.value,
      min: minimumFor(stat.value, mode),
      max: null,
      statId: stat.id,
      modType: mod.type,
    })
  }

  const category = CATEGORIES[item.itemClass]
  return {
    ...(unique && { name: item.name }),
    ...(item.baseType && { type: item.baseType }),
    ...(!item.baseType && category && { category }),
    rarity: unique ? 'unique' : craftingBase ? 'normal' : 'nonunique',
    corrupted: item.corrupted ? 'yes' : 'no',
    status: 'securable',
    listed: 'any',
    currency: 'any',
    mode,
    filters,
  }
}

export function withMode(search: ItemSearch, mode: SearchMode): ItemSearch {
  return {
    ...search,
    mode,
    filters: search.filters.map((filter) =>
      filter.value === undefined || filter.key === 'rune_sockets' ? filter : { ...filter, min: minimumFor(filter.value, mode) },
    ),
  }
}

const range = ({ min, max }: SearchFilter): Range | undefined => {
  const value: Range = {}
  if (min !== null && Number.isFinite(min)) value.min = min
  if (max !== null && Number.isFinite(max)) value.max = max
  return Object.keys(value).length > 0 ? value : undefined
}

export function toTradeQuery(search: ItemSearch): TradeQuery {
  const enabled = search.filters.filter((filter) => filter.enabled)
  const filters: TradeQuery['query']['filters'] = {
    type_filters: {
      filters: {
        rarity: { option: search.rarity },
        ...(search.category && { category: { option: search.category } }),
      },
    },
  }
  if (search.corrupted !== 'any') {
    filters.misc_filters = { filters: { corrupted: { option: search.corrupted === 'yes' ? 'true' : 'false' } } }
  }
  const tradeFilters: Record<string, { option: string }> = {}
  if (search.listed !== 'any') tradeFilters.indexed = { option: search.listed }
  if (search.currency !== 'any') tradeFilters.price = { option: search.currency }
  if (Object.keys(tradeFilters).length > 0) filters.trade_filters = { filters: tradeFilters }
  for (const filter of enabled) {
    if (filter.kind !== 'property' || !filter.target) continue
    const value = range(filter)
    if (!value) continue
    filters[filter.target.group] ??= { filters: {} }
    filters[filter.target.group].filters[filter.target.filter] = value
  }

  return {
    query: {
      status: { option: search.status },
      ...(search.name && { name: search.name }),
      ...(search.type && { type: search.type }),
      stats: [
        {
          type: 'and',
          filters: enabled
            .filter((filter) => filter.kind === 'mod' && filter.statId)
            .map((filter) => {
              const value = range(filter)
              return value ? { id: filter.statId!, value } : { id: filter.statId! }
            }),
        },
      ],
      filters,
    },
    sort: { price: 'asc' },
  }
}

const TARGETS = new Set(PROPERTIES.map((entry) => `${entry.target.group}.${entry.target.filter}`).concat(['type_filters.ilvl', 'type_filters.quality', 'equipment_filters.rune_sockets']))
const STAT_ID = /^[a-z]+\.[\w.]+$/
const optionalNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const optionalText = (value: unknown) => (typeof value === 'string' && value.length > 0 && value.length < 200 ? value : undefined)

export function sanitizeSearch(input: unknown): ItemSearch | null {
  const search = input as Partial<ItemSearch> | null
  if (!search || typeof search !== 'object' || !Array.isArray(search.filters)) return null
  if (typeof search.rarity !== 'string' || !(search.rarity in RARITY_OPTIONS)) return null

  const filters = search.filters.flatMap((raw): SearchFilter[] => {
    const filter = raw as Partial<SearchFilter> | null
    if (!filter || typeof filter.key !== 'string' || typeof filter.label !== 'string') return []
    const base = {
      key: filter.key,
      label: filter.label,
      enabled: filter.enabled === true,
      min: optionalNumber(filter.min),
      max: optionalNumber(filter.max),
    }
    if (filter.kind === 'property' && filter.target && TARGETS.has(`${filter.target.group}.${filter.target.filter}`)) {
      return [{ ...base, kind: 'property', target: { group: filter.target.group, filter: filter.target.filter } }]
    }
    if (filter.kind === 'mod' && typeof filter.statId === 'string' && STAT_ID.test(filter.statId)) {
      return [{ ...base, kind: 'mod', statId: filter.statId }]
    }
    return []
  })

  return {
    name: optionalText(search.name),
    type: optionalText(search.type),
    category: optionalText(search.category),
    rarity: search.rarity,
    corrupted: search.corrupted === 'yes' || search.corrupted === 'no' ? search.corrupted : 'any',
    status: typeof search.status === 'string' && search.status in STATUS_OPTIONS ? search.status : 'securable',
    listed: typeof search.listed === 'string' && search.listed in LISTED_OPTIONS ? search.listed : 'any',
    currency: typeof search.currency === 'string' && search.currency in CURRENCY_OPTIONS ? search.currency : 'any',
    mode: search.mode === 'exact' ? 'exact' : 'broad',
    filters,
  }
}
