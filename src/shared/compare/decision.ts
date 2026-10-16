import { formatPercent, type Comparison, type ComparisonRow } from './compare'
import type { GearComparison } from './gear'
import { DERIVED, formatNumber } from './stats'
import { itemLabel } from '../item/label'

export type Tone = 'good' | 'bad' | 'mixed'

export interface Decision {
  title: string
  detail: string
  tone: Tone
}

export interface Breakdown {
  gains: string[]
  losses: string[]
  warnings: string[]
  unscored: number
}

const SHORT_NAMES: Array<[RegExp, string]> = [
  [/^\+# to maximum (.+)$/, '$1'],
  [/^\+# to Level of all (.+) Skills$/, '$1 skill levels'],
  [/^\+# to (.+)$/, '$1'],
  [/^Allies in your Presence deal # to # added Attack (\w+) Damage$/, 'ally $1 damage'],
  [/^Allies in your Presence (?:have|deal) #% increased (.+)$/, 'ally $1'],
  [/^Minions (?:have|deal) #% increased (.+)$/, 'minion $1'],
  [/^#% increased (.+)$/, 'increased $1'],
  [/^\+#% to (.+)$/, '$1'],
  [/^\+# maximum stacks of (.+)$/, '$1 stacks'],
]

export function shortStat(stat: string): string {
  const match = SHORT_NAMES.find(([pattern]) => pattern.test(stat))
  return match ? stat.replace(match[0], match[1]) : stat.replace(/[+#%]+\s?/g, '').trim()
}

export function describeChange(row: ComparisonRow): string {
  if (row.deltaDisplay === 'New' || row.deltaDisplay === 'Lost') return `${row.deltaDisplay} ${shortStat(row.stat)}`
  const sign = row.delta > 0 ? '+' : '−'
  return `${sign}${formatNumber(Math.abs(row.delta))}${row.stat.includes('#%') ? '%' : ''} ${shortStat(row.stat)}`
}

export function breakdown(comparison: Comparison): Breakdown {
  const ranked = [...comparison.rows].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
  const warnings: string[] = []
  for (const row of comparison.rows) {
    if (row.stat === DERIVED.spirit && row.delta < 0) {
      warnings.push(`${formatNumber(-row.delta)} less Spirit: check your auras and minions still fit`)
    } else if (/Resistance$/.test(row.stat) && row.delta <= -10) {
      warnings.push(`${describeChange(row)}: check your resistances are still capped`)
    }
  }
  return {
    gains: ranked.filter((row) => row.contribution > 0).map(describeChange),
    losses: ranked.filter((row) => row.contribution < 0).map(describeChange),
    warnings,
    unscored: comparison.rows.filter((row) => row.contribution === 0).length,
  }
}

export function decide(gear: GearComparison | null, build: GearComparison | null): Decision | null {
  const name = (result: GearComparison) => itemLabel(result.equipped)
  const percent = (result: GearComparison) =>
    result.comparison.percent === null ? '' : ` (${formatPercent(result.comparison.percent)})`
  const vsGear = gear?.comparison.verdict
  const vsBuild = build?.comparison.verdict

  if (gear && build) {
    if (vsBuild === 'upgrade' && vsGear !== 'downgrade') {
      return { title: 'Equip it', detail: `Beats your ${name(gear)} and your build's ${name(build)}.`, tone: 'good' }
    }
    if (vsGear === 'upgrade') {
      return {
        title: 'Wear it for now',
        detail: `Better than your ${name(gear)}, but your build's ${name(build)} is still the goal${percent(build)}.`,
        tone: 'good',
      }
    }
    if (vsGear === 'sidegrade') {
      return { title: 'Your call', detail: `About as good as your ${name(gear)}, with different stats.`, tone: 'mixed' }
    }
    return { title: 'Skip it', detail: `Worse than your ${name(gear)} and your build's ${name(build)}.`, tone: 'bad' }
  }
  if (gear) {
    if (vsGear === 'upgrade') return { title: 'Equip it', detail: `Better than your ${name(gear)}${percent(gear)}.`, tone: 'good' }
    if (vsGear === 'sidegrade') return { title: 'Your call', detail: `About as good as your ${name(gear)}, with different stats.`, tone: 'mixed' }
    return { title: 'Keep yours', detail: `Your ${name(gear)} is better${percent(gear)}.`, tone: 'bad' }
  }
  if (build) {
    if (vsBuild === 'upgrade') return { title: 'Build upgrade', detail: `Beats your build's ${name(build)}${percent(build)}.`, tone: 'good' }
    if (vsBuild === 'sidegrade') return { title: 'Close to your build', detail: `About as good as your build's ${name(build)}.`, tone: 'mixed' }
    return { title: 'Not your build', detail: `Your build's ${name(build)} is better${percent(build)}.`, tone: 'bad' }
  }
  return null
}
