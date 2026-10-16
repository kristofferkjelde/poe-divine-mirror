import type { Mod, ModType, ParsedItem, Property, Rarity, Requirements } from '../item/types'

interface TradeProperty {
  name?: unknown
  values?: unknown
  displayMode?: unknown
}

export interface TradeItem {
  rarity?: unknown
  frameType?: unknown
  name?: unknown
  typeLine?: unknown
  baseType?: unknown
  ilvl?: unknown
  identified?: unknown
  corrupted?: unknown
  mirrored?: unknown
  properties?: TradeProperty[]
  requirements?: TradeProperty[]
  implicitMods?: unknown
  explicitMods?: unknown
  craftedMods?: unknown
  runeMods?: unknown
  enchantMods?: unknown
  fracturedMods?: unknown
  desecratedMods?: unknown
}

const RARITIES: Rarity[] = ['Normal', 'Magic', 'Rare', 'Unique', 'Gem', 'Currency']
const AUGMENTED_VALUE = 1

const MOD_FIELDS: Array<[keyof TradeItem, ModType]> = [
  ['enchantMods', 'enchant'],
  ['runeMods', 'rune'],
  ['implicitMods', 'implicit'],
  ['fracturedMods', 'fractured'],
  ['explicitMods', 'explicit'],
  ['craftedMods', 'explicit'],
  ['desecratedMods', 'desecrated'],
]

export const stripMarkup = (text: string): string =>
  text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2').replace(/\[([^\]]+)\]/g, '$1')

const text = (value: unknown): string | undefined => (typeof value === 'string' && value !== '' ? stripMarkup(value) : undefined)

function valuesOf(property: TradeProperty): Array<{ value: string; augmented: boolean }> {
  if (!Array.isArray(property.values)) return []
  return property.values.flatMap((entry: unknown) => {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') return []
    return [{ value: entry[0], augmented: entry[1] === AUGMENTED_VALUE }]
  })
}

function toProperty(property: TradeProperty): Property | null {
  const name = text(property.name)
  if (!name) return null
  const values = valuesOf(property)
  if (/\{\d+\}/.test(name)) {
    return {
      name: name.replace(/\{(\d+)\}/g, (_, index: string) => values[Number(index)]?.value ?? ''),
      value: '',
      augmented: false,
    }
  }
  return {
    name,
    value: values.map(({ value }) => value).join(', '),
    augmented: values.some(({ augmented }) => augmented),
  }
}

function toRequirements(entries: TradeProperty[] | undefined): Requirements {
  const requirements: Requirements = {}
  for (const entry of entries ?? []) {
    const name = text(entry.name) ?? ''
    const value = Number.parseInt(valuesOf(entry)[0]?.value ?? '', 10)
    if (!Number.isFinite(value)) continue
    if (/^level/i.test(name)) requirements.level = value
    else if (/^str/i.test(name)) requirements.str = value
    else if (/^dex/i.test(name)) requirements.dex = value
    else if (/^int/i.test(name)) requirements.int = value
  }
  return requirements
}

function toMod(line: string, type: ModType): Mod {
  const clean = stripMarkup(line)
  return {
    text: clean,
    template: clean.replace(/\d+(?:\.\d+)?/g, '#'),
    values: (clean.match(/\d+(?:\.\d+)?/g) ?? []).map(Number),
    type,
  }
}

function rarityOf(item: TradeItem): Rarity {
  if (typeof item.rarity === 'string' && (RARITIES as string[]).includes(item.rarity)) return item.rarity as Rarity
  return typeof item.frameType === 'number' ? (RARITIES[item.frameType] ?? 'Unknown') : 'Unknown'
}

export function toListedItem(item: TradeItem | undefined): ParsedItem | undefined {
  const typeLine = text(item?.typeLine) ?? text(item?.baseType)
  if (!item || !typeLine) return undefined
  const name = text(item.name)
  const properties = (item.properties ?? []).flatMap((property) => toProperty(property) ?? [])
  const [first] = properties
  const category = first && first.value === '' && !/\d/.test(first.name) ? first.name : undefined

  return {
    itemClass: '',
    rarity: rarityOf(item),
    name: name ?? typeLine,
    baseType: name ? typeLine : undefined,
    category,
    itemLevel: typeof item.ilvl === 'number' ? item.ilvl : undefined,
    properties: category ? properties.slice(1) : properties,
    requirements: toRequirements(item.requirements),
    mods: MOD_FIELDS.flatMap(([field, type]) => {
      const lines = item[field]
      return Array.isArray(lines) ? lines.filter((line): line is string => typeof line === 'string').map((line) => toMod(line, type)) : []
    }),
    corrupted: item.corrupted === true,
    unidentified: item.identified === false,
    mirrored: item.mirrored === true,
  }
}
