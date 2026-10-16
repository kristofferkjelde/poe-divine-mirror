import { formatPercent, type ComparisonRow } from '../../../shared/compare/compare'
import { breakdown, decide, describeChange, shortStat } from '../../../shared/compare/decision'
import type { GearComparison } from '../../../shared/compare/gear'
import { formatNumber } from '../../../shared/compare/stats'
import type { ParsedItem } from '../../../shared/item/types'
import { ItemArt } from './ItemArt'

const LEDGER_ROWS = 7

interface Props {
  item: ParsedItem
  gear: GearComparison | null
  build: GearComparison | null
  weightsNote: string
  equipHotkey: string
  detailsOpen: boolean
  onToggleDetails: () => void
}

export function DecisionCard({ item, gear, build, weightsNote, equipHotkey, detailsOpen, onToggleDetails }: Props) {
  const decision = decide(gear, build)
  const focus = gear ?? build
  if (!decision || !focus) return null
  const { warnings, unscored } = breakdown(focus.comparison)
  const stats = ledger(gear, build)

  return (
    <section className="decision" data-tone={decision.tone}>
      <header className="ember-tabs">
        <span>Worn</span>
        <h3 className="ember-plate">
          <span>Compare</span>
        </h3>
        <span>Build</span>
      </header>
      <div className="decision-slots">
        {gear ? <Slot item={gear.equipped} caption="You wear" result={gear} /> : <EmptySlot caption="You wear" hint={`Hover yours and press ${equipHotkey}`} />}
        <Slot item={item} caption="This item" highlight />
        {build ? <Slot item={build.equipped} caption="Your build" result={build} /> : <EmptySlot caption="Your build" hint="Add your build in Settings" />}
      </div>
      <div className="decision-verdict">
        <strong>{decision.title}</strong>
        <span>{decision.detail}</span>
      </div>
      {stats.length > 0 && (
        <table className="decision-ledger">
          <thead>
            <tr>
              <th scope="col">Stat</th>
              <th scope="col">Worn</th>
              <th scope="col">This</th>
              <th scope="col">Build</th>
            </tr>
          </thead>
          <tbody>
            {stats.slice(0, LEDGER_ROWS).map(({ stat, gearRow, buildRow }) => (
              <tr key={stat}>
                <td title={stat}>{shortStat(stat)}</td>
                <OtherCell row={gearRow} />
                <td className="decision-this">{(gearRow ?? buildRow)?.candidate?.display ?? '–'}</td>
                <OtherCell row={buildRow} />
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {warnings.map((warning) => (
        <p key={warning} className="decision-warning">
          ⚠ {warning}
        </p>
      ))}
      <p className="decision-note">
        {weightsNote}
        {unscored > 0 && ` · ${unscored} ${unscored === 1 ? 'stat' : 'stats'} not scored`}
      </p>
      <button type="button" className="panel-link decision-toggle" aria-expanded={detailsOpen} onClick={onToggleDetails}>
        {detailsOpen ? 'Hide full comparison' : stats.length > LEDGER_ROWS ? `Show all ${stats.length} stats` : 'Show full comparison'}
      </button>
    </section>
  )
}

interface SlotProps {
  item: ParsedItem
  caption: string
  result?: GearComparison
  highlight?: boolean
}

function Slot({ item, caption, result, highlight = false }: SlotProps) {
  return (
    <figure className="item-slot-frame decision-slot" data-highlight={highlight} data-verdict={result?.comparison.verdict}>
      <figcaption>{caption}</figcaption>
      <ItemArt item={item} />
      <strong data-rarity={item.rarity.toLowerCase()}>{item.name}</strong>
      {item.baseType && item.baseType !== item.name && <small>{item.baseType}</small>}
      {result && <span className="decision-badge">{score(result)}</span>}
    </figure>
  )
}

function EmptySlot({ caption, hint }: { caption: string; hint: string }) {
  return (
    <figure className="item-slot-frame decision-slot" data-empty>
      <figcaption>{caption}</figcaption>
      <small>{hint}</small>
    </figure>
  )
}

function OtherCell({ row }: { row?: ComparisonRow }) {
  if (!row) return <td className="decision-absent">–</td>
  const beaten = row.delta > 0 ? 'worse' : row.delta < 0 ? 'better' : undefined
  return (
    <td data-compared={beaten} title={`This item: ${describeChange(row)}`}>
      {row.equipped?.display ?? '–'}
    </td>
  )
}

const score = ({ comparison }: GearComparison) =>
  comparison.percent === null ? `${comparison.score > 0 ? '+' : ''}${formatNumber(comparison.score)}` : formatPercent(comparison.percent)

interface LedgerRow {
  stat: string
  gearRow?: ComparisonRow
  buildRow?: ComparisonRow
  weight: number
}

function ledger(gear: GearComparison | null, build: GearComparison | null): LedgerRow[] {
  const byStat = new Map<string, LedgerRow>()
  for (const row of gear?.comparison.rows ?? []) {
    byStat.set(row.stat, { stat: row.stat, gearRow: row, weight: Math.abs(row.contribution) })
  }
  for (const row of build?.comparison.rows ?? []) {
    const entry = byStat.get(row.stat) ?? { stat: row.stat, weight: 0 }
    byStat.set(row.stat, { ...entry, buildRow: row, weight: Math.max(entry.weight, Math.abs(row.contribution)) })
  }
  return [...byStat.values()].sort((a, b) => b.weight - a.weight)
}
