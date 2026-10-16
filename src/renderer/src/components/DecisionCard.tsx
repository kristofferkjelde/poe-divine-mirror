import { formatPercent } from '../../../shared/compare/compare'
import { breakdown, decide } from '../../../shared/compare/decision'
import type { GearComparison } from '../../../shared/compare/gear'
import { formatNumber } from '../../../shared/compare/stats'
import { itemLabel } from '../../../shared/item/label'

const MAX_LISTED = 4
const METER_RANGE = 50

interface Props {
  gear: GearComparison | null
  build: GearComparison | null
  weightsNote: string
  detailsOpen: boolean
  onToggleDetails: () => void
}

export function DecisionCard({ gear, build, weightsNote, detailsOpen, onToggleDetails }: Props) {
  const decision = decide(gear, build)
  const focus = gear ?? build
  if (!decision || !focus) return null
  const { gains, losses, warnings, unscored } = breakdown(focus.comparison)

  return (
    <section className="decision" data-tone={decision.tone}>
      <h3 className="decision-title">{decision.title}</h3>
      <p className="decision-detail">{decision.detail}</p>
      <div className="decision-meters">
        {gear && <Meter result={gear} caption="vs what you wear" />}
        {build && <Meter result={build} caption="vs your build" />}
      </div>
      {(gains.length > 0 || losses.length > 0) && (
        <div className="decision-changes">
          <ChangeList title="Gains" tone="good" changes={gains} />
          <ChangeList title="Losses" tone="bad" changes={losses} />
        </div>
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
        {detailsOpen ? 'Hide full comparison' : 'Show full comparison'}
      </button>
    </section>
  )
}

function ChangeList({ title, tone, changes }: { title: string; tone: 'good' | 'bad'; changes: string[] }) {
  const hidden = changes.length - MAX_LISTED
  return (
    <div>
      <h4>{title}</h4>
      <ul data-tone={tone}>
        {changes.length === 0 && <li className="decision-none">None</li>}
        {changes.slice(0, MAX_LISTED).map((change) => (
          <li key={change}>{change}</li>
        ))}
        {hidden > 0 && <li className="decision-none">+{hidden} more</li>}
      </ul>
    </div>
  )
}

function Meter({ result, caption }: { result: GearComparison; caption: string }) {
  const { percent, score, verdict } = result.comparison
  const value = percent ?? score
  const width = Math.min(Math.abs(value), METER_RANGE)
  return (
    <div className="decision-meter" data-verdict={verdict}>
      <strong>{percent === null ? `${score > 0 ? '+' : ''}${formatNumber(score)}` : formatPercent(percent)}</strong>
      <div className="decision-track" aria-hidden>
        <span
          className="decision-fill"
          style={value >= 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
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
