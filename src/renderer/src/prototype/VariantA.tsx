import { useState } from 'react'
import type { GearComparison } from '../../../shared/compare/gear'
import { GEAR_SLOTS } from '../../../shared/gear'
import { itemLabel } from '../../../shared/item/label'
import { ItemCard } from '../components/ItemCard'
import { summarize } from './insights'
import type { VariantProps } from './types'

export const name = 'Headline banner'

export function VariantA({ item, gear, build, buildName }: VariantProps) {
  return (
    <>
      {build && <Section result={build} against="build" note={`Scored for ${buildName}`} />}
      {gear && <Section result={gear} against="gear" />}
      <div className="window">
        <ItemCard item={item} />
      </div>
    </>
  )
}

function Section({ result, against, note }: { result: GearComparison; against: 'gear' | 'build'; note?: string }) {
  const [open, setOpen] = useState(false)
  const summary = summarize(result, against)
  return (
    <section className="pa window" data-tone={summary.tone}>
      <header className="pa-head">
        <span className="pa-label">{summary.label}</span>
        <span className="pa-percent">{summary.percent}</span>
      </header>
      <p className="pa-headline">{summary.headline}.</p>
      {summary.warnings.map((warning) => (
        <p key={warning.text} className="pa-warning">
          ⚠ {warning.text}
        </p>
      ))}
      <p className="pa-against">
        vs {against === 'build' ? "build's" : 'your'} {GEAR_SLOTS[result.slot].label}:{' '}
        <span className="item-value">{itemLabel(result.equipped)}</span>
        {note && <span> · {note}</span>}
      </p>
      <table className="compare-table">
        <tbody>
          {summary.scored.map((row) => (
            <tr key={row.stat} data-direction={row.contribution > 0 ? 'up' : 'down'}>
              <th scope="row">{row.stat}</th>
              <td>{row.equipped?.display ?? '–'}</td>
              <td>{row.candidate?.display ?? '–'}</td>
              <td className="compare-delta">{row.deltaDisplay}</td>
            </tr>
          ))}
          {open &&
            summary.unscored.map((row) => (
              <tr key={row.stat} data-scored="false">
                <th scope="row">{row.stat}</th>
                <td>{row.equipped?.display ?? '–'}</td>
                <td>{row.candidate?.display ?? '–'}</td>
                <td className="compare-delta">{row.deltaDisplay}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {summary.unscored.length > 0 && (
        <button type="button" className="panel-link pa-more" onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Show'} {summary.unscored.length} stats your build doesn't score
        </button>
      )}
    </section>
  )
}
