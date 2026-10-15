import type { Slot } from './item/types'

export type GearSlot =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'body'
  | 'gloves'
  | 'boots'
  | 'belt'
  | 'amulet'
  | 'ring1'
  | 'ring2'

export type Gear = Partial<Record<GearSlot, string>>

export const GEAR_SLOT_LABELS: Record<GearSlot, string> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  helmet: 'Helmet',
  body: 'Body Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  belt: 'Belt',
  amulet: 'Amulet',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
}

export function gearSlotsFor(slot: Slot | undefined): GearSlot[] {
  switch (slot) {
    case 'ring':
      return ['ring1', 'ring2']
    case 'weapon':
    case 'offhand':
    case 'helmet':
    case 'body':
    case 'gloves':
    case 'boots':
    case 'belt':
    case 'amulet':
      return [slot]
    default:
      return []
  }
}
