import type { Slot } from './types'

interface ItemClass {
  slot: Slot
  tradeCategory?: string
}

export const ITEM_CLASSES: Readonly<Record<string, ItemClass>> = {
  Claws: { slot: 'weapon', tradeCategory: 'weapon.claw' },
  Daggers: { slot: 'weapon', tradeCategory: 'weapon.dagger' },
  Wands: { slot: 'weapon', tradeCategory: 'weapon.wand' },
  'One Hand Swords': { slot: 'weapon', tradeCategory: 'weapon.onesword' },
  'One Hand Axes': { slot: 'weapon', tradeCategory: 'weapon.oneaxe' },
  'One Hand Maces': { slot: 'weapon', tradeCategory: 'weapon.onemace' },
  Sceptres: { slot: 'weapon', tradeCategory: 'weapon.sceptre' },
  Spears: { slot: 'weapon', tradeCategory: 'weapon.spear' },
  Flails: { slot: 'weapon', tradeCategory: 'weapon.flail' },
  Bows: { slot: 'weapon', tradeCategory: 'weapon.bow' },
  Staves: { slot: 'weapon', tradeCategory: 'weapon.staff' },
  'Two Hand Swords': { slot: 'weapon', tradeCategory: 'weapon.twosword' },
  'Two Hand Axes': { slot: 'weapon', tradeCategory: 'weapon.twoaxe' },
  'Two Hand Maces': { slot: 'weapon', tradeCategory: 'weapon.twomace' },
  Quarterstaves: { slot: 'weapon', tradeCategory: 'weapon.warstaff' },
  Crossbows: { slot: 'weapon', tradeCategory: 'weapon.crossbow' },
  Traps: { slot: 'weapon' },
  Talismans: { slot: 'weapon' },
  Shields: { slot: 'offhand', tradeCategory: 'armour.shield' },
  Bucklers: { slot: 'offhand', tradeCategory: 'armour.buckler' },
  Foci: { slot: 'offhand', tradeCategory: 'armour.focus' },
  Quivers: { slot: 'offhand', tradeCategory: 'armour.quiver' },
  Helmets: { slot: 'helmet', tradeCategory: 'armour.helmet' },
  'Body Armours': { slot: 'body', tradeCategory: 'armour.chest' },
  Gloves: { slot: 'gloves', tradeCategory: 'armour.gloves' },
  Boots: { slot: 'boots', tradeCategory: 'armour.boots' },
  Belts: { slot: 'belt', tradeCategory: 'accessory.belt' },
  Amulets: { slot: 'amulet', tradeCategory: 'accessory.amulet' },
  Rings: { slot: 'ring', tradeCategory: 'accessory.ring' },
  'Life Flasks': { slot: 'flask' },
  'Mana Flasks': { slot: 'flask' },
  Charms: { slot: 'charm' },
  Jewels: { slot: 'jewel', tradeCategory: 'jewel' },
}

export function itemClass(name: string): ItemClass | undefined {
  return Object.hasOwn(ITEM_CLASSES, name) ? ITEM_CLASSES[name] : undefined
}

export const ARMOUR_SLOTS: ReadonlySet<Slot> = new Set(['helmet', 'body', 'gloves', 'boots', 'offhand'])

export const isArmourSlot = (slot: Slot | undefined): boolean => !!slot && ARMOUR_SLOTS.has(slot)

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
