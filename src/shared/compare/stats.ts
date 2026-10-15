import type { Mod, ParsedItem, Slot } from '../item/types'

export interface StatValue {
  value: number
  display: string
  range?: [number, number]
}

export type StatMap = Map<string, StatValue>

export const DERIVED = {
  totalDps: 'Total DPS',
  physicalDps: 'Physical DPS',
  elementalDps: 'Elemental DPS',
  attacksPerSecond: 'Attacks per Second',
  criticalHitChance: 'Critical Hit Chance',
  armour: 'Armour',
  evasion: 'Evasion Rating',
  energyShield: 'Energy Shield',
  spirit: 'Spirit',
  block: 'Block Chance',
} as const

const ARMOUR_SLOTS = new Set<Slot>(['helmet', 'body', 'gloves', 'boots', 'offhand'])
const DEFENCES = '(?:Armour|Evasion Rating|Energy Shield)'
const LOCAL_DEFENCE = [
  new RegExp(`^#% increased ${DEFENCES}(?: and ${DEFENCES})?$`),
  /^\+# to (?:Armour|Evasion Rating|maximum Energy Shield)$/,
]
const LOCAL_WEAPON = [
  /^Adds # to # \w+ Damage$/,
  /^#% increased Physical Damage$/,
  /^#% increased Attack Speed$/,
  /^\+#% to Critical Hit Chance$/,
]
const ELEMENTS = ['Fire', 'Cold', 'Lightning']
const ATTRIBUTES = ['Strength', 'Dexterity', 'Intelligence']

export function extractStats(item: ParsedItem): StatMap {
  const stats: StatMap = new Map()

  addProperties(item, stats)

  for (const mod of item.mods) {
    if (isLocal(mod.template, item.slot)) continue
    for (const [key, value] of expandMod(mod)) {
      add(stats, key, value, mod)
    }
  }

  return stats
}

export function statKeys(mod: Mod, slot: Slot | undefined): string[] {
  if (isLocal(mod.template, slot)) return []
  return expandMod(mod).map(([key]) => key)
}

function isLocal(template: string, slot: Slot | undefined): boolean {
  if (slot === 'weapon') return LOCAL_WEAPON.some((pattern) => pattern.test(template))
  if (slot && ARMOUR_SLOTS.has(slot)) return LOCAL_DEFENCE.some((pattern) => pattern.test(template))
  return false
}

function modValue(mod: Mod): number {
  if (mod.values.length === 0) return 1
  if (mod.values.length === 2 && mod.template.startsWith('Adds')) return (mod.values[0] + mod.values[1]) / 2
  return mod.values[0]
}

function expandMod(mod: Mod): Array<[string, number]> {
  const value = modValue(mod)
  const template = mod.template

  const reduced = /^#% reduced (.+)$/.exec(template)
  if (reduced) return [[`#% increased ${reduced[1]}`, -value]]

  if (template === '+#% to all Elemental Resistances') {
    return ELEMENTS.map((element) => [`+#% to ${element} Resistance`, value])
  }
  const pairResist = /^\+#% to (\w+) and (\w+) Resistances$/.exec(template)
  if (pairResist) {
    return [pairResist[1], pairResist[2]].map((element) => [`+#% to ${element} Resistance`, value])
  }
  if (template === '+# to all Attributes') {
    return ATTRIBUTES.map((attribute) => [`+# to ${attribute}`, value])
  }
  const pairAttribute = /^\+# to (Strength|Dexterity|Intelligence) and (Strength|Dexterity|Intelligence)$/.exec(template)
  if (pairAttribute) {
    return [pairAttribute[1], pairAttribute[2]].map((attribute) => [`+# to ${attribute}`, value])
  }

  return [[template, value]]
}

function add(stats: StatMap, key: string, value: number, mod: Mod): void {
  const existing = stats.get(key)
  const total = (existing?.value ?? 0) + value

  if (mod.values.length === 0) {
    stats.set(key, { value: total, display: 'Yes' })
  } else if (mod.values.length === 2 && mod.template.startsWith('Adds')) {
    const range: [number, number] = [
      (existing?.range?.[0] ?? 0) + mod.values[0],
      (existing?.range?.[1] ?? 0) + mod.values[1],
    ]
    stats.set(key, { value: total, display: `${formatNumber(range[0])}–${formatNumber(range[1])}`, range })
  } else {
    stats.set(key, { value: total, display: formatNumber(total) })
  }
}

function addProperties(item: ParsedItem, stats: StatMap): void {
  const property = (name: string) => item.properties.find((entry) => entry.name === name)?.value

  for (const [name, key] of [
    ['Armour', DERIVED.armour],
    ['Evasion Rating', DERIVED.evasion],
    ['Energy Shield', DERIVED.energyShield],
    ['Spirit', DERIVED.spirit],
    ['Block chance', DERIVED.block],
  ] as const) {
    const value = firstNumber(property(name))
    if (value !== undefined) stats.set(key, { value, display: formatNumber(value) })
  }

  if (item.slot !== 'weapon') return

  const attacksPerSecond = firstNumber(property('Attacks per Second'))
  const critical = firstNumber(property('Critical Hit Chance'))
  if (critical !== undefined) stats.set(DERIVED.criticalHitChance, { value: critical, display: `${critical}%` })
  if (attacksPerSecond === undefined) return
  stats.set(DERIVED.attacksPerSecond, { value: attacksPerSecond, display: formatNumber(attacksPerSecond) })

  const physical = averageDamage(property('Physical Damage'))
  const elemental = item.properties
    .filter((entry) => entry.name !== 'Physical Damage' && /Damage$/.test(entry.name))
    .reduce((sum, entry) => sum + averageDamage(entry.value), 0)

  const physicalDps = physical * attacksPerSecond
  const elementalDps = elemental * attacksPerSecond
  if (physicalDps > 0) stats.set(DERIVED.physicalDps, { value: physicalDps, display: formatNumber(physicalDps) })
  if (elementalDps > 0) stats.set(DERIVED.elementalDps, { value: elementalDps, display: formatNumber(elementalDps) })
  const total = physicalDps + elementalDps
  stats.set(DERIVED.totalDps, { value: total, display: formatNumber(total) })
}

function firstNumber(value: string | undefined): number | undefined {
  const match = value && /-?\d+(?:\.\d+)?/.exec(value)
  return match ? Number(match[0]) : undefined
}

function averageDamage(value: string | undefined): number {
  if (!value) return 0
  let total = 0
  for (const [, min, max] of value.matchAll(/(\d+)(?:-| or )(\d+)/g)) {
    total += (Number(min) + Number(max)) / 2
  }
  return total
}

export function formatNumber(value: number): string {
  const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2
  return String(Number(value.toFixed(digits)))
}
