import { useState } from 'react'
import { formatPercent } from '../../../shared/compare/compare'
import type { GearComparison } from '../../../shared/compare/gear'
import { itemLabel } from '../../../shared/item/label'
import { ComparisonView } from '../components/ComparisonView'
import { ItemCard } from '../components/ItemCard'
import { decide, summarize } from './insights'
import type { VariantProps } from './types'

export const name = 'Decision card'

export function VariantB({ item, gear, build, buildName }: VariantProps) {
  const [details, setDetails] = useState(false)
  const decision = decide(gear, build)
  const focus = gear ?? build
  const summary = focus ? summarize(focus, gear ? 'gear' : 'build') : null

  return (
    <>
      <div className="window">
      <ItemCard item={item} compact />
      <section className="pb" data-tone={decision.tone}>
        <h3 className="pb-title">{decision.title}</h3>
        <p className="pb-detail">{decision.detail}</p>
        <div className="pb-meters">
          {gear && <Meter result={gear} caption="vs what you wear" />}
          {build && <Meter result={build} caption="vs your build" />}
        </div>
        {summary && (
          <div className="pb-columns">
            <div>
              <h4>Gains</h4>
              <ul>
                {summary.gains.map((gain) => (
                  <li key={gain.text} data-tone="good">
                    {gain.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Losses</h4>
              <ul>
                {summary.losses.map((loss) => (
                  <li key={loss.text} data-tone="bad">
                    {loss.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {summary?.warnings.map((warning) => (
          <p key={warning.text} className="pa-warning">
            ⚠ {warning.text}
          </p>
        ))}
        {summary && summary.unscored.length > 0 && (
          <p className="pb-unscored">
            Not scored for {buildName.split(' · ')[0]}: {summary.unscored.length} ally and utility stats
          </p>
        )}
        <button type="button" className="panel-link pa-more" onClick={() => setDetails(!details)}>
          {details ? 'Hide' : 'Show'} full comparison
        </button>
      </section>
      </div>
      {details && (
        <>
          {build && (
            <div className="window">
              <ComparisonView result={build} against="build" weightsNote={`Scored for ${buildName}`} />
            </div>
          )}
          {gear && (
            <div className="window">
              <ComparisonView result={gear} against="gear" />
            </div>
          )}
        </>
      )}
    </>
  )
}

function Meter({ result, caption }: { result: GearComparison; caption: string }) {
  const percent = result.comparison.percent ?? 0
  const width = Math.min(Math.abs(percent), 50)
  return (
    <div className="pb-meter" data-verdict={result.comparison.verdict}>
      <strong>{formatPercent(percent)}</strong>
      <div className="pb-track">
        <span className="pb-zero" />
        <span
          className="pb-fill"
          style={percent >= 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
        />
      </div>
      <small>
        {caption}
        <br />
        <span className="item-value">{itemLabel(result.equipped)}</span>
      </small>
    </div>
  )
}
