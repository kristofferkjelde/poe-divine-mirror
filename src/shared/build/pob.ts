import type { GearSlot } from '../gear'
import { parseModLine } from '../item/parse'
import type { Mod, ModType, ParsedItem, Property, Rarity, Slot } from '../item/types'
import WEAPON_BASES from './weaponBases.json'

export interface PobItem {
  gearSlot: GearSlot
  item: ParsedItem
}

interface WeaponBase {
  damage: Partial<Record<DamageType, [number, number]>>
  crit: number
  aps: number
}

type DamageType = 'Physical' | 'Fire' | 'Cold' | 'Lightning' | 'Chaos'

const BASES = WEAPON_BASES as unknown as Record<string, WeaponBase>

export interface PobBuild {
  className?: string
  ascendancy?: string
  level?: number
  mainSkill?: string
  stats: Record<string, number>
  minion: boolean
  items: PobItem[]
}

export class PobParseError extends Error {}

const SLOTS: Record<string, GearSlot> = {
  'Weapon 1': 'weapon',
  'Weapon 2': 'offhand',
  Helmet: 'helmet',
  'Body Armour': 'body',
  Gloves: 'gloves',
  Boots: 'boots',
  Belt: 'belt',
  Amulet: 'amulet',
  'Ring 1': 'ring1',
  'Ring 2': 'ring2',
}

const ITEM_SLOT: Record<GearSlot, Slot> = {
  weapon: 'weapon',
  offhand: 'offhand',
  helmet: 'helmet',
  body: 'body',
  gloves: 'gloves',
  boots: 'boots',
  belt: 'belt',
  amulet: 'amulet',
  ring1: 'ring',
  ring2: 'ring',
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, entity: string) => {
    if (entity[0] !== '#') return ENTITIES[entity] ?? match
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : match
  })
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [, name, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) result[name] = decodeEntities(value)
  return result
}

function elements(xml: string, name: string): Array<{ attrs: Record<string, string>; body: string }> {
  const pattern = new RegExp(`<${name}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${name}>)`, 'g')
  return [...xml.matchAll(pattern)].map(([, attrs, body]) => ({ attrs: attributes(attrs), body: body ?? '' }))
}

function section(xml: string, name: string): string {
  return new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(xml)?.[1] ?? ''
}

export function parsePobXml(xml: string): PobBuild {
  const build = elements(xml, 'Build')[0]
  if (/<PathOfBuilding[\s>]/.test(xml)) throw new PobParseError('That is a Path of Exile 1 build. Use a PoE 2 build instead.')
  if (!build || !xml.includes('<PathOfBuilding2')) throw new PobParseError('That is not a Path of Building build')

  const stats: Record<string, number> = {}
  for (const { attrs } of elements(build.body, 'PlayerStat')) {
    const value = Number(attrs.value)
    if (attrs.stat && Number.isFinite(value)) stats[attrs.stat] = value
  }

  return {
    className: build.attrs.className || undefined,
    ascendancy: build.attrs.ascendClassName && build.attrs.ascendClassName !== 'None' ? build.attrs.ascendClassName : undefined,
    level: Number(build.attrs.level) || undefined,
    mainSkill: mainSkill(xml, Number(build.attrs.mainSocketGroup) || 1),
    stats,
    minion: /<MinionStat\b/.test(build.body),
    items: equippedItems(xml),
  }
}

function mainSkill(xml: string, group: number): string | undefined {
  const skills = section(xml, 'Skills')
  const active = attributes(/<Skills\b([^>]*)>/.exec(xml)?.[1] ?? '').activeSkillSet ?? '1'
  const sets = elements(skills, 'SkillSet')
  const source = sets.find((set) => set.attrs.id === active)?.body ?? (sets[0]?.body || skills)
  const gems = elements(elements(source, 'Skill')[group - 1]?.body ?? '', 'Gem')
  const gem = gems.find((entry) => !/Support/i.test(entry.attrs.gemId ?? entry.attrs.skillId ?? '')) ?? gems[0]
  return gem?.attrs.nameSpec || undefined
}

function equippedItems(xml: string): PobItem[] {
  const items = section(xml, 'Items')
  const byId = new Map(elements(items, 'Item').map(({ attrs, body }) => [attrs.id, decodeEntities(body.replace(/<[^>]*>/g, ''))]))
  const active = attributes(/<Items\b([^>]*)>/.exec(xml)?.[1] ?? '').activeItemSet ?? '1'
  const sets = elements(items, 'ItemSet')
  const set = sets.find((entry) => entry.attrs.id === active) ?? sets[0]
  const slots = set ? elements(set.body, 'Slot') : elements(items, 'Slot')

  const result: PobItem[] = []
  for (const { attrs } of slots) {
    const gearSlot = SLOTS[attrs.name]
    const text = byId.get(attrs.itemId)
    if (!gearSlot || !text || attrs.itemId === '0') continue
    result.push({ gearSlot, item: parsePobItem(text, ITEM_SLOT[gearSlot]) })
  }
  return result
}

const RANGE = /\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g

const RARITIES: Record<string, Rarity> = { NORMAL: 'Normal', MAGIC: 'Magic', RARE: 'Rare', UNIQUE: 'Unique' }
const ARMOUR_PROPERTIES: Record<string, string> = {
  Armour: 'Armour',
  Evasion: 'Evasion Rating',
  'Energy Shield': 'Energy Shield',
  Spirit: 'Spirit',
}

export function parsePobItem(text: string, slot: Slot): ParsedItem {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const rarityIndex = lines.findIndex((line) => line.startsWith('Rarity:'))
  const rarity = RARITIES[lines[rarityIndex]?.slice('Rarity:'.length).trim().toUpperCase()] ?? 'Unknown'
  const named = rarity === 'Rare' || rarity === 'Unique'
  const name = lines[rarityIndex + 1] ?? 'Unknown item'
  const start = lines.findIndex((line) => /^Implicits: \d+$/.test(line))
  const header = lines.slice(rarityIndex + 1, start < 0 ? undefined : start)
  const field = (key: string) => header.find((line) => line.startsWith(`${key}: `))?.slice(key.length + 2)

  const mods = start < 0 ? [] : parsePobMods(lines.slice(start + 1), Number(/^Implicits: (\d+)$/.exec(lines[start])?.[1] ?? 0), /^Selected Variant: (\d+)$/m.exec(text)?.[1])
  const baseType = named ? lines[rarityIndex + 2] : findWeaponBase(name)
  const quality = Number(field('Quality')) || 0

  const properties: Property[] = []
  for (const [key, property] of Object.entries(ARMOUR_PROPERTIES)) {
    const value = field(key)
    if (value) properties.push({ name: property, value, augmented: false })
  }
  const base = baseType ? BASES[baseType] : undefined
  if (slot === 'weapon' && base) properties.push(...weaponProperties(base, mods, quality))

  return {
    itemClass: '',
    slot,
    rarity,
    name,
    baseType,
    itemLevel: Number(field('Item Level')) || undefined,
    quality: quality || undefined,
    properties,
    requirements: { level: Number(field('LevelReq')) || undefined },
    mods,
    corrupted: false,
    unidentified: false,
    mirrored: false,
  }
}

function findWeaponBase(name: string): string | undefined {
  return Object.keys(BASES)
    .filter((base) => name.includes(base))
    .sort((a, b) => b.length - a.length)[0]
}

interface PobLine {
  text: string
  type: ModType
  tags: Set<string>
}

interface Magnitude {
  type?: ModType
  tags: string[]
  anyTags?: string[]
  increase: number
  multiplier: number
}

const MAGNITUDE = /^(\d+)% (increased|reduced) (?:([a-z ]+?) modifier magnitudes|effect of (prefix|suffix)es)$/i
const DOUBLED = /^([a-z ]+?) modifier magnitudes are doubled$/i
const MAGNITUDE_TAGS: Record<string, string> = { defence: 'defences', enchantment: 'enchant' }
const INFERRED_TAGS: Array<[string, RegExp]> = [
  ['attack', /Attack|Accuracy/i],
  ['caster', /Spell|Cast/i],
  ['speed', /Speed/i],
  ['damage', /Damage/i],
  ['physical', /Physical/i],
  ['elemental', /Fire|Cold|Lightning|Elemental/i],
  ['fire', /Fire/i],
  ['cold', /Cold/i],
  ['lightning', /Lightning/i],
  ['chaos', /Chaos/i],
  ['life', /Life/i],
  ['mana', /Mana/i],
  ['defences', /Armour|Evasion|Energy Shield/i],
  ['resistance', /Resistance/i],
  ['critical', /Critical/i],
  ['attribute', /Strength|Dexterity|Intelligence|Attributes/i],
]

function parsePobMods(lines: string[], implicitCount: number, variant: string | undefined): Mod[] {
  const parsed: PobLine[] = []
  lines.forEach((raw, index) => {
    const flags = new Map<string, string>()
    const line = raw.replace(/^(?:\{([\w]+)(?::([^}]*))?\})+/, (prefix) => {
      for (const [, key, value] of prefix.matchAll(/\{(\w+)(?::([^}]*))?\}/g)) flags.set(key, value ?? '')
      return ''
    })
    if (!line || flags.has('disabled') || line.startsWith('Grants Skill:')) return
    if (flags.has('variant') && variant && !flags.get('variant')!.split(',').includes(variant)) return

    const range = Number(flags.get('range') ?? 0.5)
    const text = line.replace(RANGE, (_match, min: string, max: string) =>
      String(Math.round(Number(min) + (Number(max) - Number(min)) * range)),
    )
    const type: ModType = flags.has('rune')
      ? 'rune'
      : flags.has('enchant')
        ? 'enchant'
        : flags.has('desecrated')
          ? 'desecrated'
          : index < implicitCount
            ? 'implicit'
            : 'explicit'
    const tags = new Set(
      flags.get('tags')
        ? flags.get('tags')!.split(',').map((tag) => tag.trim().toLowerCase())
        : INFERRED_TAGS.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag),
    )
    for (const flag of ['prefix', 'suffix', 'desecrated']) if (flags.has(flag)) tags.add(flag)
    parsed.push({ text, type, tags })
  })

  const magnitudes = parsed.map(({ text }) => parseMagnitude(text)).filter((entry) => entry !== null)
  return parsed.map((line) => {
    const scalar = isMagnitude(line.text) || line.type === 'rune' ? 1 : magnitudeScalar(line, magnitudes)
    return parseModLine(scalar === 1 ? line.text : scaleNumbers(line.text, scalar), line.type)
  })
}

const isMagnitude = (text: string) => MAGNITUDE.test(text) || DOUBLED.test(text)

function parseMagnitude(text: string): Magnitude | null {
  const doubled = DOUBLED.exec(text)
  const match = MAGNITUDE.exec(text)
  if (!doubled && !match) return null

  const increase = match ? Number(match[1]) * (match[2].toLowerCase() === 'reduced' ? -1 : 1) : 0
  const multiplier = doubled ? 2 : 1
  if (match?.[4]) return { tags: [match[4].toLowerCase()], increase, multiplier }

  const words = (doubled?.[1] ?? match![3]).toLowerCase()
  if (words === 'explicit physical and chaos damage') {
    return { type: 'explicit', tags: ['damage'], anyTags: ['physical', 'chaos'], increase, multiplier }
  }
  const magnitude: Magnitude = { tags: [], increase, multiplier }
  for (const word of words.split(/\s+/)) {
    if (word === 'implicit' || word === 'explicit' || word === 'enchant') magnitude.type = word
    else magnitude.tags.push(MAGNITUDE_TAGS[word] ?? word)
  }
  return magnitude
}

function magnitudeScalar(line: PobLine, magnitudes: Magnitude[]): number {
  let increase = 0
  let multiplier = 1
  for (const magnitude of magnitudes) {
    if (magnitude.type && magnitude.type !== line.type) continue
    if (!magnitude.type && !['implicit', 'explicit', 'enchant', 'desecrated'].includes(line.type)) continue
    if (!magnitude.tags.every((tag) => line.tags.has(tag))) continue
    if (magnitude.anyTags && !magnitude.anyTags.some((tag) => line.tags.has(tag))) continue
    increase += magnitude.increase
    multiplier *= magnitude.multiplier
  }
  return (1 + increase / 100) * multiplier
}

function scaleNumbers(text: string, scalar: number): string {
  return text.replace(/\d+(?:\.\d+)?/g, (value) =>
    value.includes('.') ? String(Number((Number(value) * scalar).toFixed(2))) : String(Math.round(Number(value) * scalar)),
  )
}

function weaponProperties(base: WeaponBase, mods: Mod[], quality: number): Property[] {
  const sum = (template: string) =>
    mods.filter((mod) => mod.template === template).reduce((total, mod) => total + (mod.values[0] ?? 0), 0)
  const added = (type: DamageType): [number, number] =>
    mods
      .filter((mod) => mod.template === `Adds # to # ${type} Damage`)
      .reduce<[number, number]>((total, mod) => [total[0] + mod.values[0], total[1] + mod.values[1]], [0, 0])
  const damage = (type: DamageType, multiplier = 1): [number, number] | null => {
    const [baseMin, baseMax] = base.damage[type] ?? [0, 0]
    const [addMin, addMax] = added(type)
    const range: [number, number] = [Math.round((baseMin + addMin) * multiplier), Math.round((baseMax + addMax) * multiplier)]
    return range[1] > 0 ? range : null
  }
  const format = ([min, max]: [number, number]) => `${min}-${max}`

  const properties: Property[] = []
  const physical = damage('Physical', 1 + (sum('#% increased Physical Damage') + quality) / 100)
  if (physical) properties.push({ name: 'Physical Damage', value: format(physical), augmented: true })
  const elemental = (['Fire', 'Cold', 'Lightning'] as const).map((type) => damage(type)).filter((range) => range !== null)
  if (elemental.length > 0) properties.push({ name: 'Elemental Damage', value: elemental.map(format).join(', '), augmented: true })
  const chaos = damage('Chaos')
  if (chaos) properties.push({ name: 'Chaos Damage', value: format(chaos), augmented: true })

  const crit = base.crit + sum('+#% to Critical Hit Chance')
  properties.push({ name: 'Critical Hit Chance', value: `${Number(crit.toFixed(2))}%`, augmented: crit !== base.crit })
  const aps = base.aps * (1 + sum('#% increased Attack Speed') / 100)
  properties.push({ name: 'Attacks per Second', value: aps.toFixed(2), augmented: aps !== base.aps })
  return properties
}
