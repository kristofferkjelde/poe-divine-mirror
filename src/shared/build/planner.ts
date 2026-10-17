import { UserFacingError } from '../errors'
import type { Gear, GearSlot } from '../gear'

export interface PlannerStage {
  title: string
  gear: Gear
}

interface PlannerSlot {
  inventory_id?: unknown
  slot_x?: unknown
  additional_text?: unknown
  unique_name?: unknown
}

const PLANNER_SLOTS: Partial<Record<string, GearSlot>> = {
  Weapon1: 'weapon',
  Offhand1: 'offhand',
  Helm1: 'helmet',
  BodyArmour1: 'body',
  Gloves1: 'gloves',
  Boots1: 'boots',
  Amulet1: 'amulet',
  Belt1: 'belt',
  Ring1: 'ring1',
  Ring2: 'ring2',
}

const MOD_LINE = /^\d+\.\s+(.+)$/

export class PlannerParseError extends UserFacingError {}

export const stageKey = (title: string) => title.toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9]+/g, '')

export function parsePlannerBuild(text: string, fileName: string): PlannerStage {
  let data: { name?: unknown; inventory_slots?: unknown }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    throw new PlannerParseError(`${fileName} is not a .build file`)
  }
  if (typeof data !== 'object' || data === null || !Array.isArray(data.inventory_slots)) {
    throw new PlannerParseError(`${fileName} is not a .build file`)
  }

  const name = typeof data.name === 'string' ? data.name : ''
  const title = name.split(' - ')[0].trim() || fileName.replace(/\.build$/i, '')
  const gear: Gear = {}
  for (const slot of data.inventory_slots as PlannerSlot[]) {
    const gearSlot = typeof slot?.inventory_id === 'string' ? PLANNER_SLOTS[slot.inventory_id] : undefined
    if (!gearSlot || (slot.slot_x ?? 0) !== 0) continue
    const text = itemText(slot)
    if (text) gear[gearSlot] = text
  }
  return { title, gear }
}

function itemText({ additional_text, unique_name }: PlannerSlot): string | undefined {
  if (typeof unique_name === 'string' && unique_name.trim() !== '') {
    return `Rarity: UNIQUE\n${unique_name.trim()}\nImplicits: 0`
  }
  if (typeof additional_text !== 'string') return undefined
  const [base, ...lines] = additional_text.split(/\r?\n/).map((line) => line.trim())
  if (!base) return undefined
  const mods = lines.flatMap((line) => MOD_LINE.exec(line)?.[1] ?? [])
  return ['Rarity: RARE', base, base, 'Implicits: 0', ...mods].join('\n')
}
