import { formatPercent } from '../../../shared/compare/compare'
import type { GearComparison } from '../../../shared/compare/gear'
import { formatNumber } from '../../../shared/compare/stats'

export const scoreLabel = ({ comparison }: GearComparison) =>
  comparison.percent === null
    ? `${comparison.score > 0 ? '+' : ''}${formatNumber(comparison.score)}`
    : formatPercent(comparison.percent)

export const Diamond = () => <span className="inv-diamond" aria-hidden />

export function Divider() {
  return (
    <div className="inv-divider" aria-hidden>
      <Diamond />
    </div>
  )
}
