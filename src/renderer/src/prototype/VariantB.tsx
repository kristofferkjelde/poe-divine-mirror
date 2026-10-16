import { describeChange, decide, shortStat } from '../../../shared/compare/decision'
import type { ComparisonRow } from '../../../shared/compare/compare'
import type { GearComparison } from '../../../shared/compare/gear'
import type { ParsedItem } from '../../../shared/item/types'
import { scoreLabel } from './shared'
import type { VariantProps } from './types'

export const name = 'Equipment slots'

const ROWS = 7

export function VariantB({ item, gear, build }: VariantProps) {
  const decision = decide(gear, build)!
  const stats = mergeRows(gear, build)
  return (
    <div className="window inv-window ib" data-tone={decision.tone}>
      <nav className="ib-tabs" aria-label="Compare against">
        <span className="ib-tab">Worn</span>
        <span className="inv-plate ib-title">
          <span>Compare</span>
        </span>
        <span className="ib-tab">Build</span>
      </nav>
      <div className="ib-slots">
        {gear ? <Slot item={gear.equipped} caption="You wear" result={gear} /> : <EmptySlot caption="You wear" />}
        <Slot item={item} caption="This item" highlight />
        {build ? <Slot item={build.equipped} caption="Your build" result={build} /> : <EmptySlot caption="Your build" />}
      </div>
      <div className="ib-verdict">
        <strong>{decision.title}</strong>
        <span>{decision.detail}</span>
      </div>
      <table className="ib-ledger">
        <thead>
          <tr>
            <th>Stat</th>
            <th>Worn</th>
            <th>This</th>
            <th>Build</th>
          </tr>
        </thead>
        <tbody>
          {stats.slice(0, ROWS).map(({ stat, gearRow, buildRow }) => (
            <tr key={stat}>
              <td>{shortStat(stat)}</td>
              <Cell row={gearRow} side="equipped" />
              <td className="ib-this">{(gearRow ?? buildRow)?.candidate?.display ?? '–'}</td>
              <Cell row={buildRow} side="equipped" />
            </tr>
          ))}
        </tbody>
      </table>
      {stats.length > ROWS && (
        <button type="button" className="panel-link inv-link">
          {stats.length - ROWS} more stats
        </button>
      )}
    </div>
  )
}

function Slot({ item, caption, result, highlight }: { item: ParsedItem; caption: string; result?: GearComparison; highlight?: boolean }) {
  return (
    <figure className="inv-slot ib-slot" data-highlight={highlight} data-verdict={result?.comparison.verdict}>
      <figcaption>{caption}</figcaption>
      <span className="ib-glyph" aria-hidden>
        {glyph(item.itemClass)}
      </span>
      <strong data-rarity={item.rarity.toLowerCase()}>{item.name}</strong>
      <small>{item.baseType}</small>
      {result && <span className="ib-badge">{scoreLabel(result)}</span>}
    </figure>
  )
}

function EmptySlot({ caption }: { caption: string }) {
  return (
    <figure className="inv-slot ib-slot ib-empty">
      <figcaption>{caption}</figcaption>
      <small>Nothing saved</small>
    </figure>
  )
}

function Cell({ row, side }: { row?: ComparisonRow; side: 'equipped' }) {
  if (!row) return <td className="ib-muted">–</td>
  const direction = row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : 'same'
  return (
    <td data-direction={direction} title={describeChange(row)}>
      {row[side]?.display ?? '–'}
    </td>
  )
}

function mergeRows(gear: GearComparison | null, build: GearComparison | null) {
  const byStat = new Map<string, { stat: string; gearRow?: ComparisonRow; buildRow?: ComparisonRow; weight: number }>()
  for (const row of gear?.comparison.rows ?? []) byStat.set(row.stat, { stat: row.stat, gearRow: row, weight: Math.abs(row.contribution) })
  for (const row of build?.comparison.rows ?? []) {
    const entry = byStat.get(row.stat) ?? { stat: row.stat, weight: 0 }
    byStat.set(row.stat, { ...entry, buildRow: row, weight: Math.max(entry.weight, Math.abs(row.contribution)) })
  }
  return [...byStat.values()].sort((a, b) => b.weight - a.weight)
}

function glyph(itemClass: string): string {
  if (/sceptre|wand|staff/i.test(itemClass)) return '⚚'
  if (/spear|bow|sword|axe|mace|flail|quarterstaff/i.test(itemClass)) return '⚔'
  if (/ring/i.test(itemClass)) return '◯'
  if (/amulet/i.test(itemClass)) return '❖'
  if (/helmet/i.test(itemClass)) return '⛑'
  if (/shield|buckler|focus/i.test(itemClass)) return '⛨'
  return '◆'
}
