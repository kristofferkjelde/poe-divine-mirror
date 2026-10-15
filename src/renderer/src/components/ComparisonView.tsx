import { formatPercent, type ComparisonRow, type Verdict } from '../../../shared/compare/compare'
import type { GearComparison } from '../../../shared/compare/gear'
import { GEAR_SLOTS } from '../../../shared/gear'
import { formatNumber } from '../../../shared/compare/stats'
import { itemLabel } from '../../../shared/item/label'
import { forgetGear } from '../overlayStore'

const VERDICT_LABELS: Record<Verdict, string> = {
  upgrade: '▲ Upgrade',
  downgrade: '▼ Downgrade',
  sidegrade: '≈ Sidegrade',
}

interface Props {
  result: GearComparison
  against: 'gear' | 'build'
  buildName: string | undefined | null
}

export function ComparisonView({ result, against, buildName }: Props) {
  const { comparison, equipped, slot } = result

  return (
    <section className="compare" data-verdict={comparison.verdict}>
      <header className="compare-verdict">
        <strong>{VERDICT_LABELS[comparison.verdict]}</strong>
        <span className="compare-score" title={`Weighted score ${formatNumber(comparison.score)}`}>
          {comparison.percent === null
            ? `${comparison.score > 0 ? '+' : ''}${formatNumber(comparison.score)}`
            : formatPercent(comparison.percent)}
        </span>
      </header>
      <p className="compare-against">
        vs your {against === 'build' ? "build's " : ''}
        {GEAR_SLOTS[slot].label}: <span className="item-value">{itemLabel(equipped)}</span>
        {against === 'gear' && (
          <button
            type="button"
            className="panel-link compare-forget"
            title={`Forget your saved ${GEAR_SLOTS[slot].label}`}
            onClick={() => void forgetGear(slot)}
          >
            ✕ Forget
          </button>
        )}
      </p>
      {buildName !== null && (
        <p className="compare-build">
          {buildName ? `Scored for ${buildName}` : 'General weights. Add your build in Settings.'}
        </p>
      )}
      {comparison.rows.length === 0 ? (
        <p className="compare-empty">Same stats as your equipped item</p>
      ) : (
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Stat</th>
              <th scope="col">Now</th>
              <th scope="col">New</th>
              <th scope="col">±</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <Row key={row.stat} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Row({ row }: { row: ComparisonRow }) {
  const direction = row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : 'same'
  return (
    <tr
      data-direction={direction}
      data-scored={row.weight !== 0 || row.local}
      title={row.local ? 'Already counted in DPS or defences above' : row.weight === 0 ? 'Not scored' : undefined}
    >
      <th scope="row">{row.stat}</th>
      <td>{row.equipped?.display ?? '–'}</td>
      <td>{row.candidate?.display ?? '–'}</td>
      <td className="compare-delta">{row.deltaDisplay}</td>
    </tr>
  )
}
