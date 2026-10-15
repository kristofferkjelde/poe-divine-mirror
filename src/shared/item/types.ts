export type Rarity = 'Normal' | 'Magic' | 'Rare' | 'Unique' | 'Currency' | 'Gem' | 'Unknown'

export type Slot =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'body'
  | 'gloves'
  | 'boots'
  | 'belt'
  | 'amulet'
  | 'ring'
  | 'flask'
  | 'charm'
  | 'jewel'

export type ModType = 'implicit' | 'explicit' | 'rune' | 'enchant' | 'desecrated' | 'fractured'

export type Affix = 'prefix' | 'suffix'

export interface Mod {
  text: string
  template: string
  values: number[]
  type: ModType
  affix?: Affix
  tier?: number
  affixName?: string
  ranges?: Array<[number, number]>
}

export interface Property {
  name: string
  value: string
  augmented: boolean
}

export type DamageRange = [number, number]

export interface WeaponStats {
  physical?: DamageRange
  elemental: DamageRange[]
  chaos?: DamageRange
  critChance?: number
  attacksPerSecond?: number
}

export interface Requirements {
  level?: number
  str?: number
  dex?: number
  int?: number
}

export interface ParsedItem {
  itemClass: string
  slot?: Slot
  rarity: Rarity
  name: string
  baseType?: string
  category?: string
  itemLevel?: number
  quality?: number
  properties: Property[]
  weapon?: WeaponStats
  requirements: Requirements
  sockets?: string
  mods: Mod[]
  corrupted: boolean
  unidentified: boolean
  mirrored: boolean
  note?: string
}
