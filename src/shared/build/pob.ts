import { parseModLine } from '../item/parse'
import type { Mod, Slot } from '../item/types'

export interface PobItem {
  slot: Slot
  name: string
  mods: Mod[]
}

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

const SLOTS: Record<string, Slot> = {
  'Weapon 1': 'weapon',
  'Weapon 2': 'offhand',
  Helmet: 'helmet',
  'Body Armour': 'body',
  Gloves: 'gloves',
  Boots: 'boots',
  Belt: 'belt',
  Amulet: 'amulet',
  'Ring 1': 'ring',
  'Ring 2': 'ring',
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
  const byId = new Map(elements(items, 'Item').map(({ attrs, body }) => [attrs.id, decodeEntities(body)]))
  const active = attributes(/<Items\b([^>]*)>/.exec(xml)?.[1] ?? '').activeItemSet ?? '1'
  const sets = elements(items, 'ItemSet')
  const set = sets.find((entry) => entry.attrs.id === active) ?? sets[0]
  const slots = set ? elements(set.body, 'Slot') : elements(items, 'Slot')

  const result: PobItem[] = []
  for (const { attrs } of slots) {
    const slot = SLOTS[attrs.name]
    const text = byId.get(attrs.itemId)
    if (!slot || !text || attrs.itemId === '0') continue
    result.push({ slot, ...parsePobItem(text) })
  }
  return result
}

const RANGE = /\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g

export function parsePobItem(text: string): { name: string; mods: Mod[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const rarityIndex = lines.findIndex((line) => line.startsWith('Rarity:'))
  const name = lines[rarityIndex + 1] ?? 'Unknown item'
  const variant = /^Selected Variant: (\d+)$/m.exec(text)?.[1]
  const start = lines.findIndex((line) => /^Implicits: \d+$/.test(line))
  if (start < 0) return { name, mods: [] }

  const mods: Mod[] = []
  for (const raw of lines.slice(start + 1)) {
    const tags = new Map<string, string>()
    const line = raw.replace(/^(?:\{([\w]+)(?::([^}]*))?\})+/, (prefix) => {
      for (const [, key, value] of prefix.matchAll(/\{(\w+)(?::([^}]*))?\}/g)) tags.set(key, value ?? '')
      return ''
    })
    if (!line || tags.has('disabled')) continue
    if (tags.has('variant') && variant && !tags.get('variant')!.split(',').includes(variant)) continue

    const range = Number(tags.get('range') ?? 0.5)
    const resolved = line.replace(RANGE, (_match, min: string, max: string) =>
      String(Math.round(Number(min) + (Number(max) - Number(min)) * range)),
    )
    const type = tags.has('rune') ? 'rune' : tags.has('enchant') ? 'enchant' : 'explicit'
    mods.push(parseModLine(resolved, type))
  }
  return { name, mods }
}
