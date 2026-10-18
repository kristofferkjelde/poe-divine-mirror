import { DERIVED, extractStats, isLocal } from '../compare/stats'
import type { Affix, Mod, ModType, ParsedItem, Slot } from '../item/types'
import { UserFacingError } from '../errors'
import { modValue } from '../item/mods'
import { isArmourSlot, itemClass } from '../item/slots'
import { pseudoTotals, type PseudoSource } from './pseudo'

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

export function parseStats(body: unknown): TradeStatGroup[] {
  const groups = (body as { result?: unknown } | null)?.result
  if (!Array.isArray(groups) || groups.length === 0) throw new UserFacingError('The trade site sent unexpected stat data')
  return groups as TradeStatGroup[]
}

export type Corrupted = 'any' | 'yes' | 'no'
export type SearchRarity = 'nonunique' | 'normal' | 'magic' | 'rare' | 'unique'
export type SaleStatus = 'available' | 'securable' | 'online' | 'any'
export type ListedWithin = 'any' | '3hours' | '12hours' | '1day' | '3days' | '1week' | '1month'
export type PriceCurrency = 'any' | 'exalted' | 'divine' | 'chaos'

export const CORRUPTED_OPTIONS: Record<Corrupted, string> = { any: 'Corrupted: any', yes: 'Corrupted', no: 'Not corrupted' }

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

interface FilterBase {
  key: string
  label: string
  enabled: boolean
  min: number | null
  max: number | null
}

export type SearchFilter = FilterBase &
  (
    | { kind: 'property'; target: PropertyTarget; value: number }
    | ({ kind: 'mod'; statId: string; value?: number } & ModOrigin)
    | ({ kind: 'unsearchable' } & ModOrigin)
    | { kind: 'pseudo'; statId: string; value: number }
  )

interface ModOrigin {
  modType: ModType
  affix?: Affix
  tier?: number
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
  scale: number
  filters: SearchFilter[]
}

export type SearchOptions = Pick<ItemSearch, 'rarity' | 'corrupted' | 'status' | 'listed' | 'currency'>
export type FilterEdit = Pick<FilterBase, 'enabled' | 'min' | 'max'>

export interface SearchEdit {
  options: SearchOptions
  filters: Record<string, FilterEdit>
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

export class PriceCheckUnsupported extends UserFacingError {}

export const SCALE_STEP = 5
export const SCALE_LIMIT = 50
export const PRESET_SCALES = [-20, -10] as const
const UNSCALED = new Set(['rune_sockets', 'ilvl'])
const MAX_QUALITY = 20
const LOW_VALUE = [/Stun Threshold/, /Light Radius/, /Attribute Requirements/]

const MOD_TYPES: ReadonlySet<ModType> = new Set(['explicit', 'fractured', 'desecrated', 'implicit', 'rune', 'enchant'])
const ENABLED_TYPES: ReadonlySet<ModType> = new Set(['explicit', 'fractured', 'desecrated'])

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
  { stat: DERIVED.armour, label: 'Armour', target: { group: 'equipment_filters', filter: 'ar' }, enabled: isArmourSlot },
  { stat: DERIVED.evasion, label: 'Evasion', target: { group: 'equipment_filters', filter: 'ev' }, enabled: isArmourSlot },
  { stat: DERIVED.energyShield, label: 'Energy Shield', target: { group: 'equipment_filters', filter: 'es' }, enabled: isArmourSlot },
  { stat: DERIVED.block, label: 'Block', target: { group: 'equipment_filters', filter: 'block' }, enabled: () => false },
  { stat: DERIVED.spirit, label: 'Spirit', target: { group: 'equipment_filters', filter: 'spirit' }, enabled: () => true },
]

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

export function minimumFor(value: number | undefined, scale: number): number | null {
  if (value === undefined || value <= 0) return null
  if (scale === 0) return value
  const scaled = value * (1 + scale / 100)
  const round = scale < 0 ? Math.floor : Math.ceil
  return Number.isInteger(value) ? round(scaled) : round(scaled * 100) / 100
}

export const clampScale = (scale: number) =>
  Math.max(-SCALE_LIMIT, Math.min(SCALE_LIMIT, Math.round(scale / SCALE_STEP) * SCALE_STEP))

const LOCAL_INCREASE: Partial<Record<string, RegExp>> = {
  [DERIVED.armour]: /^#% increased .*Armour/,
  [DERIVED.evasion]: /^#% increased .*Evasion/,
  [DERIVED.energyShield]: /^#% increased .*Energy Shield/,
  [DERIVED.physicalDps]: /^#% increased Physical Damage$/,
}

const localIncrease = (item: ParsedItem, pattern: RegExp) =>
  item.mods
    .filter((mod) => pattern.test(mod.template) && isLocal(mod.template, item.slot))
    .reduce((sum, mod) => sum + (modValue(mod) ?? 0), 0)

function qualityScale(item: ParsedItem, stat: string): number {
  const quality = item.quality ?? 0
  const pattern = LOCAL_INCREASE[stat]
  if (quality >= MAX_QUALITY || !pattern) return 1
  const increase = localIncrease(item, pattern)
  return (100 + increase + MAX_QUALITY) / (100 + increase + quality)
}

export function atMaxQuality(item: ParsedItem, stat: string, value: number, physicalDps = 0): number {
  if (stat === DERIVED.totalDps) {
    const boost = physicalDps * (qualityScale(item, DERIVED.physicalDps) - 1)
    return Math.floor((value + boost) * 10) / 10
  }
  const scale = qualityScale(item, stat)
  if (scale === 1) return value
  return stat === DERIVED.physicalDps ? Math.floor(value * scale * 10) / 10 : Math.floor(value * scale)
}

function property(key: string, label: string, value: number, enabled: boolean, target: PropertyTarget, scale: number): SearchFilter {
  return { key, label, kind: 'property', enabled, value, min: minimumFor(value, UNSCALED.has(key) ? 0 : scale), max: null, target }
}

export function defaultSearch(item: ParsedItem, groups: TradeStatGroup[], scale = 0): ItemSearch {
  if (item.unidentified && item.rarity !== 'Unique') throw new PriceCheckUnsupported('Identify the item first')
  if (item.rarity === 'Currency' || item.rarity === 'Gem' || item.rarity === 'Unknown') {
    throw new PriceCheckUnsupported('Price check works on gear. Use the currency exchange for this one.')
  }

  const unique = item.rarity === 'Unique'
  const filters: SearchFilter[] = []
  const stats = extractStats(item)

  const physicalDps = stats.get(DERIVED.physicalDps)?.value ?? 0
  for (const entry of PROPERTIES) {
    const stat = stats.get(entry.stat)
    if (stat && stat.value > 0) {
      const value = unique ? stat.value : atMaxQuality(item, entry.stat, stat.value, physicalDps)
      const label = value === stat.value ? entry.label : `${entry.label} (at 20% quality)`
      filters.push(property(entry.target.filter, label, value, !unique && entry.enabled(item.slot), entry.target, scale))
    }
  }
  const craftingBase = item.rarity === 'Normal'
  if (item.itemLevel) {
    filters.push({
      ...property('ilvl', 'Item Level', item.itemLevel, craftingBase, { group: 'type_filters', filter: 'ilvl' }, scale),
      ...(craftingBase && { min: item.itemLevel }),
    })
  }
  if (item.quality) {
    filters.push(property('quality', 'Quality', item.quality, false, { group: 'type_filters', filter: 'quality' }, scale))
  }
  const sockets = item.sockets?.split(/\s+/).filter(Boolean).length
  if (sockets) {
    filters.push(property('rune_sockets', 'Rune Sockets', sockets, false, { group: 'equipment_filters', filter: 'rune_sockets' }, 0))
  }

  const pseudoSources: PseudoSource[] = item.mods.flatMap((mod, index) => {
    const value = modValue(mod)
    return MOD_TYPES.has(mod.type) && value !== undefined && !isLocal(mod.template, item.slot)
      ? [{ index, template: mod.template, value }]
      : []
  })
  const pseudos = unique ? [] : pseudoTotals(pseudoSources, groups)
  const coveredByPseudo = new Set(pseudos.flatMap((pseudo) => pseudo.sources))
  for (const pseudo of pseudos) {
    filters.push({
      key: pseudo.key,
      label: pseudo.label,
      kind: 'pseudo',
      enabled: true,
      value: pseudo.value,
      min: minimumFor(pseudo.value, scale),
      max: null,
      statId: pseudo.statId,
    })
  }

  for (const [index, mod] of item.mods.entries()) {
    if (!MOD_TYPES.has(mod.type)) continue
    const local = isLocal(mod.template, item.slot)
    const stat = matchStat(mod, groups, local)
    const key = `mod-${index}`
    const origin: ModOrigin = {
      modType: mod.type,
      ...(mod.affix && { affix: mod.affix }),
      ...(mod.tier !== undefined && { tier: mod.tier }),
    }
    if (!stat) {
      filters.push({ key, label: mod.text, kind: 'unsearchable', enabled: false, min: null, max: null, ...origin })
      continue
    }
    const coveredByProperty = local && (item.slot === 'weapon' || isArmourSlot(item.slot))
    filters.push({
      key,
      label: mod.text,
      kind: 'mod',
      enabled:
        !unique &&
        ENABLED_TYPES.has(mod.type) &&
        !coveredByProperty &&
        !coveredByPseudo.has(index) &&
        !LOW_VALUE.some((pattern) => pattern.test(mod.template)),
      value: stat.value,
      min: minimumFor(stat.value, scale),
      max: null,
      statId: stat.id,
      ...origin,
    })
  }

  const category = itemClass(item.itemClass)?.tradeCategory
  return {
    ...(unique && { name: item.name }),
    ...(item.baseType && { type: item.baseType }),
    ...(!item.baseType && category && { category }),
    rarity: unique ? 'unique' : craftingBase ? 'normal' : item.rarity === 'Magic' ? 'magic' : item.rarity === 'Rare' ? 'rare' : 'nonunique',
    corrupted: item.corrupted ? 'yes' : 'any',
    status: 'securable',
    listed: 'any',
    currency: 'any',
    scale,
    filters,
  }
}

export function withScale(search: ItemSearch, scale: number): ItemSearch {
  const next = clampScale(scale)
  return {
    ...search,
    scale: next,
    filters: search.filters.map((filter) =>
      filter.kind === 'unsearchable' || filter.value === undefined || UNSCALED.has(filter.key)
        ? filter
        : { ...filter, min: minimumFor(filter.value, next) },
    ),
  }
}

const range = ({ min, max }: FilterBase): Range | undefined => {
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
    if (filter.kind !== 'property') continue
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
          filters: enabled.flatMap((filter) => {
            if (filter.kind !== 'mod' && filter.kind !== 'pseudo') return []
            const value = range(filter)
            return [value ? { id: filter.statId, value } : { id: filter.statId }]
          }),
        },
      ],
      filters,
    },
    sort: { price: 'asc' },
  }
}

export const toSearchEdit = (search: ItemSearch): SearchEdit => ({
  options: { rarity: search.rarity, corrupted: search.corrupted, status: search.status, listed: search.listed, currency: search.currency },
  filters: Object.fromEntries(search.filters.map(({ key, enabled, min, max }) => [key, { enabled, min, max }])),
})

const option = <T extends string>(options: Record<T, string>, value: unknown, fallback: T): T =>
  typeof value === 'string' && Object.hasOwn(options, value) ? (value as T) : fallback

const finiteOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

const entry = (record: unknown, key: string): Record<string, unknown> | undefined => {
  if (typeof record !== 'object' || record === null || !Object.hasOwn(record, key)) return undefined
  const value = (record as Record<string, unknown>)[key]
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

export function applyEdit(search: ItemSearch, edit: unknown): ItemSearch {
  const options = entry(edit, 'options')
  return {
    ...search,
    rarity: option(RARITY_OPTIONS, options?.rarity, search.rarity),
    corrupted: option(CORRUPTED_OPTIONS, options?.corrupted, search.corrupted),
    status: option(STATUS_OPTIONS, options?.status, search.status),
    listed: option(LISTED_OPTIONS, options?.listed, search.listed),
    currency: option(CURRENCY_OPTIONS, options?.currency, search.currency),
    filters: search.filters.map((filter) => {
      const change = entry(entry(edit, 'filters'), filter.key)
      if (!change || filter.kind === 'unsearchable') return filter
      return { ...filter, enabled: change.enabled === true, min: finiteOrNull(change.min), max: finiteOrNull(change.max) }
    }),
  }
}
