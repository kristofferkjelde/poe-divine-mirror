import type { Gear, GearSlot } from '../gear'
import type { PlannerStage } from './planner'

interface MobalyticsItem {
  commonItem?: {
    name?: unknown
    isUnique?: unknown
    explicitDescriptions?: unknown
    stats?: unknown
  } | null
}

const STAT_FIELDS: Partial<Record<string, string>> = {
  Armour: 'Armour',
  'Evasion Rating': 'Evasion',
  Evasion: 'Evasion',
  'Energy Shield': 'Energy Shield',
  Quality: 'Quality',
  'Item Level': 'Item Level',
}

export interface MobalyticsStage extends PlannerStage {
  id: string
}

type Equipment = Record<string, unknown>

const SLOTS: Array<[GearSlot, (equipment: Equipment) => unknown]> = [
  ['weapon', (equipment) => (equipment.mainHand as Equipment | null)?.set1],
  ['offhand', (equipment) => (equipment.offHand as Equipment | null)?.set1],
  ['helmet', (equipment) => equipment.helmet],
  ['body', (equipment) => equipment.body],
  ['gloves', (equipment) => equipment.gloves],
  ['boots', (equipment) => equipment.boots],
  ['amulet', (equipment) => equipment.amulet],
  ['belt', (equipment) => equipment.belt],
  ['ring1', (equipment) => equipment.leftRing],
  ['ring2', (equipment) => equipment.rightRing],
]

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function collect(value: unknown, key: string, found: unknown[] = [], depth = 0): unknown[] {
  if (depth > 40 || !isObject(value)) return found
  if (Array.isArray(value)) {
    for (const entry of value) collect(entry, key, found, depth + 1)
    return found
  }
  for (const [name, child] of Object.entries(value)) {
    if (name === key) found.push(child)
    collect(child, key, found, depth + 1)
  }
  return found
}

export function mobalyticsStages(state: unknown): MobalyticsStage[] {
  const titles = new Map<string, string>()
  for (const list of collect(state, 'childrenVariants')) {
    if (!Array.isArray(list)) continue
    for (const variant of list) {
      if (isObject(variant) && typeof variant.id === 'string' && typeof variant.title === 'string') titles.set(variant.id, variant.title)
    }
  }

  const stages: MobalyticsStage[] = []
  for (const variants of collect(state, 'buildVariants')) {
    const values = isObject(variants) ? variants.values : undefined
    if (!Array.isArray(values)) continue
    for (const variant of values) {
      if (!isObject(variant) || typeof variant.id !== 'string' || !isObject(variant.equipment)) continue
      const title = titles.get(variant.id)
      if (!title) continue
      stages.push({ id: variant.id, title, gear: equipmentGear(variant.equipment) })
    }
  }
  return stages
}

function equipmentGear(equipment: Equipment): Gear {
  const gear: Gear = {}
  for (const [slot, pick] of SLOTS) {
    const text = itemText(pick(equipment))
    if (text) gear[slot] = text
  }
  return gear
}

function itemText(value: unknown): string | undefined {
  const item = isObject(value) ? (value as MobalyticsItem).commonItem : undefined
  if (!isObject(item) || typeof item.name !== 'string' || item.name.trim() === '') return undefined
  const name = item.name.trim()
  if (item.isUnique === true) return `Rarity: UNIQUE\n${name}\nImplicits: 0`
  const mods = Array.isArray(item.explicitDescriptions)
    ? item.explicitDescriptions.flatMap((entry) =>
        isObject(entry) && typeof entry.description === 'string' ? entry.description.split(/\r?\n/) : [],
      )
    : []
  const fields = Array.isArray(item.stats)
    ? item.stats.flatMap((stat) => {
        const field = isObject(stat) && typeof stat.name === 'string' ? STAT_FIELDS[stat.name] : undefined
        return field && typeof stat.value === 'string' && /^\d+$/.test(stat.value) ? [`${field}: ${stat.value}`] : []
      })
    : []
  return ['Rarity: RARE', name, name, ...fields, 'Implicits: 0', ...mods].join('\n')
}
