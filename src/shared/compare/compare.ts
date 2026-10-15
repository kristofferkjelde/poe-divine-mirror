import type { ParsedItem, Slot } from '../item/types'
import { extractStats, formatNumber, type StatMap, type StatValue } from './stats'
import { DEFAULT_WEIGHTS, weightFor, type WeightRule } from './weights'

export type Verdict = 'upgrade' | 'downgrade' | 'sidegrade'

export interface ComparisonRow {
  stat: string
  candidate?: StatValue
  equipped?: StatValue
  delta: number
  deltaDisplay: string
  weight: number
  contribution: number
  local: boolean
}

export interface Comparison {
  rows: ComparisonRow[]
  score: number
  percent: number | null
  verdict: Verdict
}

const SIDEGRADE_MARGIN = 3
const SIDEGRADE_PERCENT = 2

export function compareItems(
  candidate: ParsedItem,
  equipped: ParsedItem,
  rules: WeightRule[] = DEFAULT_WEIGHTS,
): Comparison {
  const candidateStats = extractStats(candidate)
  const equippedStats = extractStats(equipped)
  const stats = new Set([...candidateStats.keys(), ...equippedStats.keys()])

  const rows: ComparisonRow[] = []
  for (const stat of stats) {
    const next = candidateStats.get(stat)
    const current = equippedStats.get(stat)
    const delta = (next?.value ?? 0) - (current?.value ?? 0)
    if (delta === 0 && next?.display === current?.display) continue

    const local = Boolean(next?.local || current?.local)
    const weight = local ? 0 : weightFor(stat, candidate.slot, rules)
    rows.push({
      local,
      stat,
      candidate: next,
      equipped: current,
      delta,
      deltaDisplay: formatDelta(delta, next, current),
      weight,
      contribution: delta * weight,
    })
  }

  const rank = (row: ComparisonRow) => (row.weight !== 0 ? 0 : row.local ? 1 : 2)
  rows.sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b)
    return Math.abs(b.contribution) - Math.abs(a.contribution)
  })

  const score = rows.reduce((sum, row) => sum + row.contribution, 0)
  const baseline = weightedTotal(equippedStats, candidate.slot, rules)
  const percent = baseline > 0 ? (score / baseline) * 100 : null
  const [value, margin] = percent === null ? [score, SIDEGRADE_MARGIN] : [percent, SIDEGRADE_PERCENT]
  const verdict: Verdict = value >= margin ? 'upgrade' : value <= -margin ? 'downgrade' : 'sidegrade'

  return { rows, score, percent, verdict }
}

function weightedTotal(stats: StatMap, slot: Slot | undefined, rules: WeightRule[]): number {
  let total = 0
  for (const [stat, { value, local }] of stats) if (!local) total += value * weightFor(stat, slot, rules)
  return total
}

export function formatPercent(percent: number): string {
  const rounded = Math.abs(percent) >= 10 ? Math.round(percent) : Math.round(percent * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

function formatDelta(delta: number, next: StatValue | undefined, current: StatValue | undefined): string {
  if (next?.display === 'Yes' && !current) return 'New'
  if (current?.display === 'Yes' && !next) return 'Lost'
  return `${delta > 0 ? '+' : ''}${formatNumber(delta)}`
}
