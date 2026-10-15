import type { Slot } from './item/types'

export const GEAR_SLOTS = {
  weapon: { slot: 'weapon', label: 'Weapon', pob: 'Weapon 1' },
  offhand: { slot: 'offhand', label: 'Off-hand', pob: 'Weapon 2' },
  helmet: { slot: 'helmet', label: 'Helmet', pob: 'Helmet' },
  body: { slot: 'body', label: 'Body Armour', pob: 'Body Armour' },
  gloves: { slot: 'gloves', label: 'Gloves', pob: 'Gloves' },
  boots: { slot: 'boots', label: 'Boots', pob: 'Boots' },
  belt: { slot: 'belt', label: 'Belt', pob: 'Belt' },
  amulet: { slot: 'amulet', label: 'Amulet', pob: 'Amulet' },
  ring1: { slot: 'ring', label: 'Ring 1', pob: 'Ring 1' },
  ring2: { slot: 'ring', label: 'Ring 2', pob: 'Ring 2' },
} as const satisfies Record<string, { slot: Slot; label: string; pob: string }>

export type GearSlot = keyof typeof GEAR_SLOTS

export type Gear = Partial<Record<GearSlot, string>>

const GEAR_SLOT_IDS = Object.keys(GEAR_SLOTS) as GearSlot[]

export const isGearSlot = (value: unknown): value is GearSlot =>
  typeof value === 'string' && Object.hasOwn(GEAR_SLOTS, value)

export function gearSlotsFor(slot: Slot | undefined): GearSlot[] {
  return GEAR_SLOT_IDS.filter((id) => GEAR_SLOTS[id].slot === slot)
}

export function gearSlotForPob(name: string): GearSlot | undefined {
  return GEAR_SLOT_IDS.find((id) => GEAR_SLOTS[id].pob === name)
}

export function isGear(value: unknown): value is Gear {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.entries(value).every(([slot, text]) => isGearSlot(slot) && typeof text === 'string')
  )
}
