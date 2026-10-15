import { DERIVED, statKeys } from '../compare/stats'
import { DEFAULT_WEIGHTS, matchingRule, type WeightRule, type WeightTag } from '../compare/weights'
import type { PobBuild } from './pob'

export type Defence = 'armour' | 'evasion' | 'energyShield'

export interface BuildProfile {
  name: string
  source: string
  importedAt: number
  focus: { attack: boolean; spell: boolean; minion: boolean }
  defences: Defence[]
  lowLife: boolean
  gearStats: string[]
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
  for (const item of build.items) {
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
    name,
    source,
    importedAt: Date.now(),
    focus: { attack, spell, minion },
    defences,
    lowLife: energyShield > life * 1.5,
    gearStats: [...gearStats].sort(),
    custom: {},
  }
}

function tagMultiplier(tag: WeightTag | undefined, profile: BuildProfile): number {
  switch (tag) {
    case 'attack':
    case 'spell':
    case 'minion':
      return profile.focus[tag] ? 1 : 0
    case 'armour':
    case 'evasion':
      return profile.defences.includes(tag) ? 1.5 : OFF_DEFENCE
    case 'energyShield':
      return profile.lowLife ? 2.5 : profile.defences.includes(tag) ? 1.5 : OFF_DEFENCE
    case 'life':
      return profile.lowLife ? 0.2 : 1
    default:
      return 1
  }
}

const SKILL_LEVEL = /^\+# to Level of all (.+) Skills$/i

function skillLevelWeight(family: string, base: number, profile: BuildProfile): number {
  const relevant = (Object.keys(SKILL_FAMILIES) as Array<keyof BuildProfile['focus']>).some(
    (focus) => profile.focus[focus] && SKILL_FAMILIES[focus].test(family),
  )
  return relevant ? base : 1
}

function baseRules(profile: BuildProfile): WeightRule[] {
  return DEFAULT_WEIGHTS.flatMap((rule): WeightRule[] => {
    if (rule.tag !== 'skillLevel') return [{ ...rule, weight: rule.weight * tagMultiplier(rule.tag, profile) }]
    return [
      ...SKILL_FAMILY_NAMES.map((family) => ({
        stat: `+# to Level of all ${family} Skills`,
        weight: skillLevelWeight(family, rule.weight, profile),
        tag: rule.tag,
      })),
      { ...rule, weight: 1 },
    ]
  })
}

function gearWeight(stat: string, base: WeightRule[]): number {
  if (SKILL_LEVEL.test(stat)) return matchingRule(stat, undefined, DEFAULT_WEIGHTS)?.weight ?? 0
  const weight = matchingRule(stat, undefined, base)?.weight ?? 0
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
      weight: round(matchingRule(stat, undefined, rules)?.weight ?? 0),
      fromBuild: gear.has(stat),
      custom: stat in profile.custom,
    }))
    .filter((entry) => entry.custom || entry.fromBuild || (entry.weight !== 0 && !(SKILL_LEVEL.test(entry.stat) && entry.weight <= 1)))
    .sort((a, b) => b.weight - a.weight || a.stat.localeCompare(b.stat))
}

const round = (value: number) => Math.round(value * 100) / 100

export function isBuildProfile(value: unknown): value is BuildProfile {
  const profile = value as BuildProfile | null
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
    Object.values(profile.custom).every((weight) => Number.isFinite(weight))
  )
}
