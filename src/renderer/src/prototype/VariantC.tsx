import { useState } from 'react'
import { breakdown, decide } from '../../../shared/compare/decision'
import type { GearComparison } from '../../../shared/compare/gear'
import { itemLabel } from '../../../shared/item/label'
import { ItemCard } from '../components/ItemCard'
import { Diamond, scoreLabel } from './shared'
import type { VariantProps } from './types'

export const name = 'Halo shrine'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function VariantC({ item, gear, build }: VariantProps) {
  const decision = decide(gear, build)!
  const tabs = [gear && { key: 'gear', label: 'Worn', result: gear }, build && { key: 'build', label: 'Build', result: build }].filter(
    (tab): tab is { key: string; label: string; result: GearComparison } => Boolean(tab),
  )
  const [active, setActive] = useState(tabs[0].key)
  const tab = tabs.find(({ key }) => key === active) ?? tabs[0]
  const { gains, losses, warnings } = breakdown(tab.result.comparison)
  const changes = [...gains.map((text) => ({ text, tone: 'good' })), ...losses.map((text) => ({ text, tone: 'bad' }))]

  return (
    <>
      <div className="window inv-window ic" data-tone={decision.tone}>
        <div className="ic-tabs" role="tablist">
          {tabs.map(({ key, label, result }) => (
            <button key={key} type="button" role="tab" aria-selected={key === tab.key} data-verdict={result.comparison.verdict} onClick={() => setActive(key)}>
              {label} <span>{scoreLabel(result)}</span>
            </button>
          ))}
        </div>
        <div className="ic-shrine">
          <Halo result={tab.result} />
          <h3 className="ic-title">{decision.title}</h3>
          <p className="ic-against">
            against <span className="item-value">{itemLabel(tab.result.equipped)}</span>
          </p>
        </div>
        <ol className="ic-tablet">
          {changes.slice(0, 6).map(({ text, tone }) => (
            <li key={text} data-tone={tone}>
              <Diamond />
              {text}
            </li>
          ))}
        </ol>
        {warnings.map((warning) => (
          <p key={warning} className="ic-seal">
            {warning}
          </p>
        ))}
      </div>
      <div className="window inv-window">
        <ItemCard item={item} compact />
      </div>
    </>
  )
}

function Halo({ result }: { result: GearComparison }) {
  const value = result.comparison.percent ?? result.comparison.score
  const share = Math.min(Math.abs(value), 100) / 100
  return (
    <svg className="ic-halo" viewBox="0 0 140 140" data-verdict={result.comparison.verdict} role="img" aria-label={scoreLabel(result)}>
      <defs>
        <radialGradient id="ic-glow">
          <stop offset="0%" stopColor="#f6e2a2" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#c8aa6e" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#c8aa6e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="70" r="68" fill="url(#ic-glow)" />
      {Array.from({ length: 24 }, (_, index) => (
        <line key={index} x1="70" y1="6" x2="70" y2="12" className="ic-ray" transform={`rotate(${index * 15} 70 70)`} />
      ))}
      <circle cx="70" cy="70" r={RADIUS} className="ic-ring" />
      <circle
        cx="70"
        cy="70"
        r={RADIUS}
        className="ic-arc"
        strokeDasharray={`${share * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="78" className="ic-score">
        {scoreLabel(result)}
      </text>
    </svg>
  )
}
