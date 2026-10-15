import { slotForItemClass } from './slots'
import type { Affix, Mod, ModType, ParsedItem, Property, Rarity, Requirements } from './types'

const SEPARATOR = /^-{8,}$/
const FLAGS = new Set(['Corrupted', 'Unidentified', 'Mirrored', 'Split', 'Unmodifiable'])
const RARITIES = new Set<Rarity>(['Normal', 'Magic', 'Rare', 'Unique', 'Currency', 'Gem'])
const MOD_SUFFIX = /\s\((implicit|rune|enchant|desecrated|fractured|crafted)\)$/
const NUMBER = /([+-]?)(\d+(?:\.\d+)?)(?:\((-?\d+(?:\.\d+)?)(?:-(-?\d+(?:\.\d+)?))?\))?/g
const ADVANCED_NOTE = /\s+—\s+Unscalable Value$/
const PROPERTY = /^([^:{}]+): (.+)$/
const INSTRUCTION = /^(Right click|Place into|Can only|Used when|Shift click|Travel to|Stack Size|Can roll .+ modifiers$)/

export class ItemParseError extends Error {}

export function parseItem(raw: string): ParsedItem {
  const sections = splitSections(raw)
  const header = sections.shift()
  if (!header) throw new ItemParseError('Clipboard does not contain an item')

  const item = parseHeader(header)
  let seenItemLevel = false
  let seenMods = false

  for (const [index, section] of sections.entries()) {
    const first = section[0]

    if (section.every((line) => FLAGS.has(line))) {
      item.corrupted ||= section.includes('Corrupted')
      item.unidentified ||= section.includes('Unidentified')
      item.mirrored ||= section.includes('Mirrored')
      continue
    }
    if (first.startsWith('Requires') || first.startsWith('Requirements:')) {
      item.requirements = parseRequirements(section)
      continue
    }
    if (first.startsWith('Item Level:')) {
      item.itemLevel = Number.parseInt(first.slice('Item Level:'.length), 10)
      seenItemLevel = true
      continue
    }
    if (first.startsWith('Sockets:')) {
      item.sockets = first.slice('Sockets:'.length).trim()
      continue
    }
    if (first.startsWith('Note:')) {
      item.note = first.slice('Note:'.length).trim()
      continue
    }
    if (section.some((line) => line.startsWith('{ '))) {
      item.mods.push(...parseAdvancedMods(section))
      seenMods = true
      continue
    }
    if (!seenItemLevel || first.startsWith('Grants Skill:')) {
      parseProperties(section, item)
      continue
    }
    if (section.every((line) => INSTRUCTION.test(line))) continue
    if (seenMods && isFlavourText(section, item.rarity, sections.slice(index + 1))) continue

    item.mods.push(...section.filter((line) => !INSTRUCTION.test(line)).map((line) => parseModLine(line)))
    seenMods = true
  }

  return item
}

function splitSections(raw: string): string[][] {
  const sections: string[][] = [[]]
  for (const line of raw.replace(/\r/g, '').split('\n')) {
    const trimmed = line.trim()
    if (SEPARATOR.test(trimmed)) {
      sections.push([])
    } else if (trimmed) {
      sections[sections.length - 1].push(trimmed)
    }
  }
  return sections.filter((section) => section.length > 0)
}

function parseHeader(lines: string[]): ParsedItem {
  let itemClass = ''
  let rarity: Rarity = 'Unknown'
  const names: string[] = []

  for (const line of lines) {
    if (line.startsWith('Item Class:')) {
      itemClass = line.slice('Item Class:'.length).trim()
    } else if (line.startsWith('Rarity:')) {
      const value = line.slice('Rarity:'.length).trim() as Rarity
      rarity = RARITIES.has(value) ? value : 'Unknown'
    } else {
      names.push(line)
    }
  }

  if (!itemClass && rarity === 'Unknown') {
    throw new ItemParseError('Clipboard does not contain an item')
  }

  const [name = '', second] = names
  const baseType = second ?? (rarity === 'Magic' ? undefined : name)

  return {
    itemClass,
    slot: slotForItemClass(itemClass),
    rarity,
    name,
    baseType,
    properties: [],
    requirements: {},
    mods: [],
    corrupted: false,
    unidentified: false,
    mirrored: false,
  }
}

function parseProperties(section: string[], item: ParsedItem): void {
  for (const [index, line] of section.entries()) {
    const match = PROPERTY.exec(line)
    if (!match) {
      if (index === 0 && !item.category && !/\d/.test(line)) item.category = line
      else item.properties.push({ name: line, value: '', augmented: false })
      continue
    }
    const augmented = line.includes('(augmented)')
    const value = match[2].replace(/\s*\(augmented\)/g, '').trim()
    const property: Property = { name: match[1].trim(), value, augmented }
    item.properties.push(property)
    if (property.name === 'Quality') item.quality = Number.parseInt(value.replace('+', ''), 10)
  }
}

function parseRequirements(section: string[]): Requirements {
  const text = section.join(', ').replace(/\s*\((augmented|unmet)\)/g, '')
  const requirements: Requirements = {}
  const level = /Level:? (\d+)/.exec(text)
  if (level) requirements.level = Number(level[1])

  for (const [, value, attribute] of text.matchAll(/(\d+) (Str|Dex|Int)\b/g)) {
    requirements[attribute.toLowerCase() as 'str' | 'dex' | 'int'] = Number(value)
  }
  for (const [, attribute, value] of text.matchAll(/\b(Str|Dex|Int):\s*(\d+)/g)) {
    requirements[attribute.toLowerCase() as 'str' | 'dex' | 'int'] = Number(value)
  }
  return requirements
}

function isFlavourText(section: string[], rarity: Rarity, rest: string[][]): boolean {
  if (rarity !== 'Unique' || section.some((line) => /\d/.test(line))) return false
  return rest.every((next) => next.every((line) => FLAGS.has(line) || line.startsWith('Note:')))
}

export function parseModLine(line: string, fallbackType: ModType = 'explicit'): Mod {
  const cleaned = line.replace(ADVANCED_NOTE, '')
  const suffix = MOD_SUFFIX.exec(cleaned)
  const body = suffix ? cleaned.slice(0, suffix.index) : cleaned
  const type = suffix ? toModType(suffix[1]) : fallbackType

  const values: number[] = []
  const ranges: Array<[number, number]> = []
  for (const [, sign, digits, min, max] of body.matchAll(NUMBER)) {
    const value = Number(digits) * (sign === '-' ? -1 : 1)
    values.push(value)
    if (min !== undefined && max !== undefined) ranges.push([Number(min), Number(max)])
  }

  const text = body.replace(NUMBER, (_match, sign: string, digits: string) => `${sign}${digits}`)
  const template = body.replace(NUMBER, (_match, sign: string) => (sign ? '+#' : '#'))

  const mod: Mod = { text, template, values, type }
  if (ranges.length > 0) mod.ranges = ranges
  return mod
}

function toModType(value: string): ModType {
  if (value === 'crafted') return 'explicit'
  return value as ModType
}

interface AdvancedHeader {
  type: ModType
  affix?: Affix
  tier?: number
  affixName?: string
}

function parseAdvancedHeader(line: string): AdvancedHeader {
  const inner = line.replace(/^\{\s*/, '').replace(/\s*\}$/, '')
  const kind = inner.split(/\s+(?:Modifier|")/)[0].toLowerCase()
  const affixName = /"([^"]+)"/.exec(inner)?.[1]
  const tier = /\((?:Tier|Rank): (\d+)\)/.exec(inner)?.[1]

  const header: AdvancedHeader = { type: 'explicit' }
  if (kind.includes('implicit')) header.type = 'implicit'
  else if (kind.includes('rune')) header.type = 'rune'
  else if (kind.includes('enchant')) header.type = 'enchant'
  else if (kind.includes('desecrated')) header.type = 'desecrated'
  else if (kind.includes('fractured')) header.type = 'fractured'
  if (kind.includes('prefix')) header.affix = 'prefix'
  if (kind.includes('suffix')) header.affix = 'suffix'
  if (tier) header.tier = Number(tier)
  if (affixName) header.affixName = affixName
  return header
}

function parseAdvancedMods(section: string[]): Mod[] {
  const mods: Mod[] = []
  let header: AdvancedHeader = { type: 'explicit' }

  for (const line of section) {
    if (line.startsWith('{')) {
      header = parseAdvancedHeader(line)
      continue
    }
    if (line.startsWith('(') && line.endsWith(')')) continue
    if (INSTRUCTION.test(line)) continue

    const mod = parseModLine(line, header.type)
    if (MOD_SUFFIX.test(line)) {
      mods.push(mod)
      continue
    }
    mods.push({
      ...mod,
      type: header.type,
      ...(header.affix && { affix: header.affix }),
      ...(header.tier !== undefined && { tier: header.tier }),
      ...(header.affixName && { affixName: header.affixName }),
    })
  }
  return mods
}
