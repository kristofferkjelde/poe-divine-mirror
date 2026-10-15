import type { ParsedItem } from '../item/types'
import { extractStats, formatNumber, type StatValue } from './stats'
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
}

export interface Comparison {
  rows: ComparisonRow[]
  score: number
  verdict: Verdict
}

const SIDEGRADE_MARGIN = 3

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

    const weight = weightFor(stat, candidate.slot, rules)
    rows.push({
      stat,
      candidate: next,
      equipped: current,
      delta,
      deltaDisplay: formatDelta(delta, next, current),
      weight,
      contribution: delta * weight,
    })
  }

  rows.sort((a, b) => {
    if ((a.weight === 0) !== (b.weight === 0)) return a.weight === 0 ? 1 : -1
    return Math.abs(b.contribution) - Math.abs(a.contribution)
  })

  const score = rows.reduce((sum, row) => sum + row.contribution, 0)
  const verdict: Verdict =
    score >= SIDEGRADE_MARGIN ? 'upgrade' : score <= -SIDEGRADE_MARGIN ? 'downgrade' : 'sidegrade'

  return { rows, score, verdict }
}

function formatDelta(delta: number, next: StatValue | undefined, current: StatValue | undefined): string {
  if (next?.display === 'Yes' && !current) return 'New'
  if (current?.display === 'Yes' && !next) return 'Lost'
  return `${delta > 0 ? '+' : ''}${formatNumber(delta)}`
}
