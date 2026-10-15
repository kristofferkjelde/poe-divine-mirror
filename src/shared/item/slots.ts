import type { Slot } from './types'

const WEAPON_CLASSES = new Set([
  'Claws',
  'Daggers',
  'Wands',
  'One Hand Swords',
  'One Hand Axes',
  'One Hand Maces',
  'Sceptres',
  'Spears',
  'Flails',
  'Bows',
  'Staves',
  'Two Hand Swords',
  'Two Hand Axes',
  'Two Hand Maces',
  'Quarterstaves',
  'Crossbows',
  'Traps',
  'Talismans',
])

const SLOT_BY_CLASS: Record<string, Slot> = {
  Shields: 'offhand',
  Bucklers: 'offhand',
  Foci: 'offhand',
  Quivers: 'offhand',
  Helmets: 'helmet',
  'Body Armours': 'body',
  Gloves: 'gloves',
  Boots: 'boots',
  Belts: 'belt',
  Amulets: 'amulet',
  Rings: 'ring',
  'Life Flasks': 'flask',
  'Mana Flasks': 'flask',
  Charms: 'charm',
  Jewels: 'jewel',
}

export function slotForItemClass(itemClass: string): Slot | undefined {
  if (WEAPON_CLASSES.has(itemClass)) return 'weapon'
  return SLOT_BY_CLASS[itemClass]
}

export const SLOT_LABELS: Record<Slot, string> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  helmet: 'Helmet',
  body: 'Body Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  belt: 'Belt',
  amulet: 'Amulet',
  ring: 'Ring',
  flask: 'Flask',
  charm: 'Charm',
  jewel: 'Jewel',
}
