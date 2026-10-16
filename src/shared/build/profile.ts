import type { ParsedGear } from '../compare/gear'
import { DERIVED, statKeys } from '../compare/stats'
import { DEFAULT_WEIGHTS, ruleWeight, weightFor, type WeightRule } from '../compare/weights'
import type { ItemSet, PobBuild } from './pob'

export type Defence = 'armour' | 'evasion' | 'energyShield'

export const PROFILE_VERSION = 3

export interface BuildProfile {
  version?: number
  code?: string
  name: string
  source: string
  importedAt: number
  focus: { attack: boolean; spell: boolean; minion: boolean }
  defences: Defence[]
  lowLife: boolean
  gearStats: string[]
  items: ParsedGear
  itemSets?: ItemSet[]
  itemSet?: string
  custom: Record<string, number>
}

const GEAR_BOOST = 1.5
const UNLISTED_GEAR_WEIGHT = 0.5
const OFF_DEFENCE = 0.15
const SKILL_FAMILIES: Record<keyof BuildProfile['focus'], RegExp> = {
  attack: /Melee|Projectile|Attack|Bow|Spear|Crossbow|Quarterstaff|Mace/i,
  spell: /Spell/i,
  minion: /Minion/i,
}

const SKILL_FAMILY_NAMES = [
  'Melee',
  'Projectile',
  'Attack',
  'Spell',
  'Minion',
  'Fire Spell',
  'Cold Spell',
  'Lightning Spell',
  'Chaos Spell',
  'Physical Spell',
]

export function profileFromPob(build: PobBuild, source: string): BuildProfile {
  const gearStats = new Set<string>()
  const items: ParsedGear = {}
  for (const { gearSlot, item } of build.items) {
    items[gearSlot] = item
    for (const mod of item.mods) statKeys(mod, item.slot).forEach((key) => gearStats.add(key))
    if (item.slot === 'weapon' && item.mods.some((mod) => /^Adds # to # \w+ Damage$|Physical Damage$|Attack Speed$/.test(mod.template))) {
      gearStats.add(DERIVED.totalDps)
    }
  }

  const stats = build.stats
  const attack = 'HitChance' in stats || 'AverageDamage' in stats || [...gearStats].some((key) => /Attack/.test(key))
  const minion = build.minion
  const spell = (!attack && !minion) || [...gearStats].some((key) => /Spell/.test(key))

  const life = stats.Life ?? 0
  const energyShield = stats.EnergyShield ?? 0
  const pools: Array<[Defence, number]> = [
    ['armour', stats.Armour ?? 0],
    ['evasion', stats.Evasion ?? 0],
    ['energyShield', energyShield * 4],
  ]
  const total = pools.reduce((sum, [, value]) => sum + value, 0)
  const defences = total > 0 ? pools.filter(([, value]) => value / total >= 0.15).map(([kind]) => kind) : []

  const name = [build.ascendancy ?? build.className, build.mainSkill].filter(Boolean).join(' · ') || 'Imported build'
  return {
    version: PROFILE_VERSION,
    name,
    source,
    importedAt: Date.now(),
    focus: { attack, spell, minion },
    defences,
    lowLife: energyShield > life * 1.5,
    gearStats: [...gearStats].sort(),
    items,
    itemSets: build.itemSets,
    itemSet: build.itemSet,
    custom: {},
  }
}

export function stageTitle(profile: BuildProfile): string | undefined {
  if (!profile.itemSets || profile.itemSets.length < 2) return undefined
  return profile.itemSets.find(({ id }) => id === profile.itemSet)?.title
}

const SKILL_LEVEL = /^\+# to Level of all (.+) Skills$/i

function focusesSkillFamily(stat: string, profile: BuildProfile): boolean {
  const family = SKILL_LEVEL.exec(stat)?.[1] ?? ''
  return (Object.keys(SKILL_FAMILIES) as Array<keyof BuildProfile['focus']>).some(
    (focus) => profile.focus[focus] && SKILL_FAMILIES[focus].test(family),
  )
}

function multiplier(rule: WeightRule, stat: string, profile: BuildProfile): number {
  switch (rule.tag) {
    case 'attack':
    case 'spell':
    case 'minion':
      return profile.focus[rule.tag] ? 1 : 0
    case 'skillLevel':
      return focusesSkillFamily(stat, profile) ? 1 : 0
    case 'armour':
    case 'evasion':
      return profile.defences.includes(rule.tag) ? 1.5 : OFF_DEFENCE
    case 'energyShield':
      return profile.lowLife ? 2.5 : profile.defences.includes(rule.tag) ? 1.5 : OFF_DEFENCE
    case 'life':
      return profile.lowLife ? 0.2 : 1
    default:
      return 1
  }
}

function baseRules(profile: BuildProfile): WeightRule[] {
  return DEFAULT_WEIGHTS.map((rule) => ({
    ...rule,
    weight: (stat: string) => ruleWeight(rule, stat) * multiplier(rule, stat, profile),
  }))
}

function gearWeight(stat: string, base: WeightRule[]): number {
  const weight = weightFor(stat, undefined, base)
  return weight > 0 ? weight * GEAR_BOOST : UNLISTED_GEAR_WEIGHT
}

export function rulesForProfile(profile: BuildProfile | null): WeightRule[] {
  if (!profile) return DEFAULT_WEIGHTS
  const base = baseRules(profile)
  return [
    ...Object.entries(profile.custom).map(([stat, weight]) => ({ stat, weight })),
    ...profile.gearStats.map((stat) => ({ stat, weight: gearWeight(stat, base) })),
    ...base,
  ]
}

export const DISPLAY_STATS = [
  DERIVED.totalDps,
  '+# to maximum Life',
  '+# to maximum Energy Shield',
  '+# to maximum Mana',
  '+#% to Fire Resistance',
  '+#% to Cold Resistance',
  '+#% to Lightning Resistance',
  '+#% to Chaos Resistance',
  '+# to Strength',
  '+# to Dexterity',
  '+# to Intelligence',
  '#% increased Movement Speed',
  '#% increased Attack Speed',
  '#% increased Cast Speed',
  '#% increased Critical Hit Chance',
  '#% increased Critical Damage Bonus',
  '#% increased Spell Damage',
  'Adds # to # Physical Damage to Attacks',
  DERIVED.armour,
  DERIVED.evasion,
  DERIVED.energyShield,
  ...SKILL_FAMILY_NAMES.map((family) => `+# to Level of all ${family} Skills`),
]

export interface ProfileWeight {
  stat: string
  weight: number
  fromBuild: boolean
  custom: boolean
}

export function profileWeights(profile: BuildProfile): ProfileWeight[] {
  const rules = rulesForProfile(profile)
  const gear = new Set(profile.gearStats)
  const stats = new Set([...profile.gearStats, ...DISPLAY_STATS, ...Object.keys(profile.custom)])
  return [...stats]
    .map((stat) => ({
      stat,
      weight: round(weightFor(stat, undefined, rules)),
      fromBuild: gear.has(stat),
      custom: stat in profile.custom,
    }))
    .filter((entry) => entry.custom || entry.fromBuild || entry.weight !== 0)
    .sort((a, b) => b.weight - a.weight || a.stat.localeCompare(b.stat))
}

const round = (value: number) => Math.round(value * 100) / 100

export type StoredProfile = Omit<BuildProfile, 'items'> & { items?: ParsedGear }

export const hasItems = (profile: StoredProfile): profile is BuildProfile => profile.items !== undefined

export function isStoredProfile(value: unknown): value is StoredProfile {
  const profile = value as StoredProfile | null
  return (
    typeof profile === 'object' &&
    profile !== null &&
    typeof profile.name === 'string' &&
    typeof profile.source === 'string' &&
    typeof profile.focus === 'object' &&
    Array.isArray(profile.defences) &&
    Array.isArray(profile.gearStats) &&
    profile.gearStats.every((stat) => typeof stat === 'string') &&
    typeof profile.custom === 'object' &&
    profile.custom !== null &&
    Object.values(profile.custom).every((weight) => Number.isFinite(weight)) &&
    (profile.items === undefined || (typeof profile.items === 'object' && profile.items !== null))
  )
}
