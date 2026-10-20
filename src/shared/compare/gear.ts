import { gearSlotsFor, type Gear, type GearSlot } from '../gear'
import { parseItem } from '../item/parse'
import type { ParsedItem } from '../item/types'
import { compareItems, type Comparison } from './compare'
import type { WeightRule } from './weights'

export type ParsedGear = Partial<Record<GearSlot, ParsedItem>>

export function parseGear(gear: Gear): ParsedGear {
  const parsed: ParsedGear = {}
  for (const [slot, text] of Object.entries(gear) as Array<[GearSlot, string]>) {
    try {
      parsed[slot] = parseItem(text)
    } catch {
      continue
    }
  }
  return parsed
}

export interface GearComparison {
  slot: GearSlot
  equipped: ParsedItem
  comparison: Comparison
}

export function compareEachSlot(candidate: ParsedItem, gear: ParsedGear, rules?: WeightRule[]): GearComparison[] {
  const results = gearSlotsFor(candidate.slot).flatMap((slot) => {
    const equipped = gear[slot]
    return equipped ? [{ slot, equipped, comparison: compareItems(candidate, equipped, rules) }] : []
  })
  const worn = (result: GearComparison) => Number(isSameItem(result.equipped, candidate))
  return results.sort((a, b) => worn(b) - worn(a) || b.comparison.score - a.comparison.score)
}

export function compareWithGear(
  candidate: ParsedItem,
  gear: ParsedGear,
  rules?: WeightRule[],
): GearComparison | null {
  return compareEachSlot(candidate, gear, rules)[0] ?? null
}

export function chooseEquipSlot(item: ParsedItem, gear: ParsedGear, rules?: WeightRule[]): GearSlot | undefined {
  const slots = gearSlotsFor(item.slot)
  if (slots.length <= 1) return slots[0]

  const same = slots.find((slot) => isSameItem(gear[slot], item))
  if (same) return same

  const empty = slots.find((slot) => !gear[slot])
  if (empty) return empty

  return compareWithGear(item, gear, rules)?.slot ?? slots[0]
}

function isSameItem(a: ParsedItem | undefined, b: ParsedItem): boolean {
  if (!a) return false
  return (
    a.name === b.name &&
    a.baseType === b.baseType &&
    a.mods.length === b.mods.length &&
    a.mods.every((mod, index) => mod.text === b.mods[index].text)
  )
}
