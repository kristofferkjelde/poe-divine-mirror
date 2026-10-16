import { formatPercent, type ComparisonRow } from '../../../shared/compare/compare'
import type { GearComparison } from '../../../shared/compare/gear'
import { DERIVED, formatNumber } from '../../../shared/compare/stats'
import { GEAR_SLOTS } from '../../../shared/gear'
import { itemLabel } from '../../../shared/item/label'

export type Tone = 'good' | 'bad' | 'warn' | 'muted'

export interface Insight {
  tone: Tone
  text: string
  row?: ComparisonRow
}

export interface Summary {
  label: string
  tone: Tone
  headline: string
  percent: string
  gains: Insight[]
  losses: Insight[]
  warnings: Insight[]
  unscored: ComparisonRow[]
  scored: ComparisonRow[]
}

export function shortStat(stat: string): string {
  const rules: Array<[RegExp, string]> = [
    [/^\+# to maximum (.+)$/, '$1'],
    [/^\+# to Level of all (.+) Skills$/, '$1 skill levels'],
    [/^\+# to (.+)$/, '$1'],
    [/^Allies in your Presence deal # to # added Attack (\w+) Damage$/, 'ally $1 damage'],
    [/^Allies in your Presence have #% increased (.+)$/, 'ally $1'],
    [/^Allies in your Presence deal #% increased (.+)$/, 'ally $1'],
    [/^Minions deal #% increased (.+)$/, 'minion $1'],
    [/^#% increased (.+)$/, 'increased $1'],
    [/^\+#% to (.+)$/, '$1'],
    [/^\+# maximum stacks of (.+)$/, '$1 stacks'],
  ]
  for (const [pattern, replacement] of rules) if (pattern.test(stat)) return stat.replace(pattern, replacement)
  return stat.replace(/[+#%]+\s?/g, '').trim()
}

const isPercent = (stat: string) => stat.includes('#%')

export function phrase(row: ComparisonRow): string {
  if (row.deltaDisplay === 'New' || row.deltaDisplay === 'Lost') return `${row.deltaDisplay.toLowerCase()} ${shortStat(row.stat)}`
  const sign = row.delta > 0 ? '+' : '−'
  return `${sign}${formatNumber(Math.abs(row.delta))}${isPercent(row.stat) ? '%' : ''} ${shortStat(row.stat)}`
}

function label(result: GearComparison, gains: Insight[], losses: Insight[]): [string, Tone] {
  const percent = result.comparison.percent ?? 0
  if (result.comparison.verdict === 'sidegrade') return gains.length && losses.length ? ['Trade-off', 'warn'] : ['Sidegrade', 'muted']
  if (percent >= 15) return ['Big upgrade', 'good']
  if (percent > 0) return ['Upgrade', 'good']
  if (percent <= -15) return ['Big downgrade', 'bad']
  return ['Downgrade', 'bad']
}

export function summarize(result: GearComparison, against: 'gear' | 'build'): Summary {
  const { comparison, equipped, slot } = result
  const scored = comparison.rows.filter((row) => row.contribution !== 0)
  const unscored = comparison.rows.filter((row) => row.contribution === 0)
  const gains = scored
    .filter((row) => row.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .map((row): Insight => ({ tone: 'good', text: phrase(row), row }))
  const losses = scored
    .filter((row) => row.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .map((row): Insight => ({ tone: 'bad', text: phrase(row), row }))

  const warnings: Insight[] = []
  const spirit = comparison.rows.find((row) => row.stat === DERIVED.spirit)
  if (spirit && spirit.delta < 0) {
    warnings.push({ tone: 'warn', text: `${formatNumber(-spirit.delta)} less Spirit: check your auras and minions still fit` })
  }
  for (const row of comparison.rows) {
    if (/Resistance/.test(row.stat) && row.delta <= -10) warnings.push({ tone: 'warn', text: `${phrase(row)}: re-check your resistance cap` })
  }

  const [text, tone] = label(result, gains, losses)
  const target = against === 'build' ? `your build's ${itemLabel(equipped)}` : `your ${itemLabel(equipped)}`
  const top = (list: Insight[]) => list.slice(0, 2).map((insight) => insight.text).join(' and ')
  const headline =
    comparison.verdict === 'upgrade'
      ? `Beats ${target} on ${top(gains)}${losses.length ? `, despite ${losses[0].text}` : ''}`
      : comparison.verdict === 'downgrade'
        ? `Worse than ${target}: ${top(losses)}${gains.length ? `, only partly made up by ${gains[0].text}` : ''}`
        : `About even with ${target}${gains.length ? `: ${top(gains)} for ${top(losses) || 'nothing'}` : ''}`

  return {
    label: text,
    tone,
    headline,
    percent: comparison.percent === null ? `${comparison.score > 0 ? '+' : ''}${formatNumber(comparison.score)}` : formatPercent(comparison.percent),
    gains,
    losses,
    warnings,
    scored,
    unscored,
  }
}

export interface Decision {
  title: string
  detail: string
  tone: Tone
}

export function decide(gear: GearComparison | null, build: GearComparison | null): Decision {
  const vsGear = gear?.comparison.verdict
  const vsBuild = build?.comparison.verdict
  const name = (result: GearComparison) => itemLabel(result.equipped)
  if (gear && build && vsGear === 'upgrade' && vsBuild !== 'upgrade') {
    return {
      title: 'Wear it for now',
      detail: `Better than your ${name(gear)}, but your build's ${name(build)} is still the goal (${formatPercent(build.comparison.percent ?? 0)}).`,
      tone: 'good',
    }
  }
  if (vsGear === 'upgrade' && vsBuild === 'upgrade') return { title: 'Equip it', detail: 'Beats both your gear and your build’s item.', tone: 'good' }
  if (vsGear === 'downgrade' && (vsBuild ?? 'downgrade') === 'downgrade') return { title: 'Skip it', detail: 'Worse than what you wear and what your build wants.', tone: 'bad' }
  if (gear && vsGear === 'sidegrade') return { title: 'Your call', detail: `Trades stats with your ${name(gear)} at about the same value.`, tone: 'warn' }
  const slot = (gear ?? build)?.slot
  return { title: 'Keep what you have', detail: slot ? `Not an upgrade for your ${GEAR_SLOTS[slot].label}.` : 'Not an upgrade.', tone: 'bad' }
}
