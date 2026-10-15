import { formatPercent, type ComparisonRow, type Verdict } from '../../../shared/compare/compare'
import type { GearComparison } from '../../../shared/compare/gear'
import { GEAR_SLOT_LABELS } from '../../../shared/gear'
import { formatNumber } from '../../../shared/compare/stats'

const VERDICT_LABELS: Record<Verdict, string> = {
  upgrade: '▲ Upgrade',
  downgrade: '▼ Downgrade',
  sidegrade: '≈ Sidegrade',
}

export function ComparisonView({ result, buildName }: { result: GearComparison; buildName?: string }) {
  const { comparison, equipped, slot } = result
  const scored = comparison.rows.filter((row) => row.weight !== 0)
  const unscored = comparison.rows.filter((row) => row.weight === 0)

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
        vs your {GEAR_SLOT_LABELS[slot]}: <span className="item-value">{equipped.name}</span>
      </p>
      <p className="compare-build">
        {buildName ? `Scored for ${buildName}` : 'General weights. Add your build in Settings.'}
      </p>
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
            {scored.map((row) => (
              <Row key={row.stat} row={row} />
            ))}
            {unscored.map((row) => (
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
    <tr data-direction={direction} data-scored={row.weight !== 0} title={row.weight === 0 ? 'Not scored' : undefined}>
      <th scope="row">{row.stat}</th>
      <td>{row.equipped?.display ?? '–'}</td>
      <td>{row.candidate?.display ?? '–'}</td>
      <td className="compare-delta">{row.deltaDisplay}</td>
    </tr>
  )
}
