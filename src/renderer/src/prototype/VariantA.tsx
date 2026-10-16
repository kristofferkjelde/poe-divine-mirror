import { breakdown, decide } from '../../../shared/compare/decision'
import type { GearComparison } from '../../../shared/compare/gear'
import { itemLabel } from '../../../shared/item/label'
import { ItemCard } from '../components/ItemCard'
import { Divider, scoreLabel } from './shared'
import type { VariantProps } from './types'

export const name = 'Gilded plaque'

export function VariantA({ item, gear, build, buildName }: VariantProps) {
  const decision = decide(gear, build)!
  const { gains, losses, warnings, unscored } = breakdown((gear ?? build)!.comparison)
  return (
    <>
      <div className="window inv-window ia" data-tone={decision.tone}>
        <div className="inv-plate ia-plate">
          <span>{decision.title}</span>
        </div>
        <ItemCard item={item} compact />
        <p className="ia-detail">{decision.detail}</p>
        <div className="ia-slots">
          {gear && <ScoreSlot result={gear} caption="Worn" />}
          {build && <ScoreSlot result={build} caption="Build" />}
        </div>
        <Divider />
        <div className="ia-columns">
          <Column title="Gains" tone="good" lines={gains} />
          <Column title="Losses" tone="bad" lines={losses} />
        </div>
        {warnings.map((warning) => (
          <p key={warning} className="inv-warning">
            {warning}
          </p>
        ))}
        <p className="inv-note">
          Scored for {buildName} · {unscored} stats not scored
        </p>
        <button type="button" className="panel-link inv-link">
          Show full comparison
        </button>
      </div>
    </>
  )
}

function ScoreSlot({ result, caption }: { result: GearComparison; caption: string }) {
  return (
    <div className="inv-slot ia-slot" data-verdict={result.comparison.verdict}>
      <small>{caption}</small>
      <strong>{scoreLabel(result)}</strong>
      <span className="item-value">{itemLabel(result.equipped)}</span>
    </div>
  )
}

function Column({ title, tone, lines }: { title: string; tone: 'good' | 'bad'; lines: string[] }) {
  return (
    <div>
      <h4>{title}</h4>
      <ul data-tone={tone}>
        {lines.length === 0 && <li className="inv-none">None</li>}
        {lines.slice(0, 4).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
