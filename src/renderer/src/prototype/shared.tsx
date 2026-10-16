import type { SearchFilter } from '../../../shared/trade/query'

export const Diamond = () => <span className="inv-diamond" aria-hidden />

export function Divider() {
  return (
    <div className="inv-divider" aria-hidden>
      <Diamond />
    </div>
  )
}

export function Tier({ filter }: { filter: SearchFilter }) {
  if (filter.kind === 'pseudo') return <span className="item-tier">Σ</span>
  if (filter.kind === 'property' || !filter.affix) return null
  return (
    <span className="item-tier" data-best={filter.tier !== undefined && filter.tier <= 2}>
      {filter.affix === 'prefix' ? 'P' : 'S'}
      {filter.tier}
    </span>
  )
}

export const RELIABILITY_PIPS = { 'Very low': 1, Low: 2, Medium: 3, High: 4 } as const

export function Pips({ reliability }: { reliability: keyof typeof RELIABILITY_PIPS }) {
  return (
    <span className="ev-pips" data-reliability={reliability} aria-label={`Reliability ${reliability}`}>
      {[1, 2, 3, 4].map((pip) => (
        <span key={pip} data-on={pip <= RELIABILITY_PIPS[reliability]} />
      ))}
    </span>
  )
}

export const PRESETS = [
  { label: 'Quick price', scale: 0 },
  { label: 'Broad (−10%)', scale: -10 },
]
