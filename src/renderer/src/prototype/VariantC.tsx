import { useState } from 'react'
import type { GearComparison } from '../../../shared/compare/gear'
import { itemLabel } from '../../../shared/item/label'
import { ItemCard } from '../components/ItemCard'
import { phrase, shortStat, summarize } from './insights'
import type { VariantProps } from './types'

export const name = 'Why bars'

export function VariantC({ item, gear, build, buildName }: VariantProps) {
  const tabs = [
    ...(gear ? [{ key: 'gear' as const, label: 'Your gear', result: gear }] : []),
    ...(build ? [{ key: 'build' as const, label: 'Build goal', result: build }] : []),
  ]
  const [active, setActive] = useState(tabs[0]?.key)
  const tab = tabs.find((entry) => entry.key === active) ?? tabs[0]

  return (
    <>
      {tab && (
        <section className="pc">
          <nav className="pc-tabs">
            {tabs.map((entry) => {
              const summary = summarize(entry.result, entry.key)
              return (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={entry.key === tab.key}
                  data-tone={summary.tone}
                  onClick={() => setActive(entry.key)}
                >
                  {entry.label} <span>{summary.percent}</span>
                </button>
              )
            })}
          </nav>
          <Breakdown result={tab.result} against={tab.key} buildName={buildName} />
        </section>
      )}
      <ItemCard item={item} />
    </>
  )
}

function Breakdown({ result, against, buildName }: { result: GearComparison; against: 'gear' | 'build'; buildName: string }) {
  const summary = summarize(result, against)
  const max = Math.max(...summary.scored.map((row) => Math.abs(row.contribution)), 1)
  return (
    <div className="pc-body" data-tone={summary.tone}>
      <p className="pc-label">
        <span>{summary.label}</span> vs {itemLabel(result.equipped)}
      </p>
      <p className="pc-headline">{summary.headline}.</p>
      <ul className="pc-bars">
        {summary.scored.map((row) => {
          const width = (Math.abs(row.contribution) / max) * 50
          return (
            <li key={row.stat} title={`${row.stat}: weight ${row.weight}`}>
              <span className="pc-name">{shortStat(row.stat)}</span>
              <span className="pc-track">
                <span
                  className="pc-fill"
                  data-direction={row.contribution > 0 ? 'up' : 'down'}
                  style={row.contribution > 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
                />
              </span>
              <span className="pc-delta" data-direction={row.contribution > 0 ? 'up' : 'down'}>
                {phrase(row).split(' ')[0]}
              </span>
            </li>
          )
        })}
      </ul>
      {summary.warnings.map((warning) => (
        <p key={warning.text} className="pa-warning">
          ⚠ {warning.text}
        </p>
      ))}
      {summary.unscored.length > 0 && (
        <p className="pc-unscored">
          <span>Not scored for {buildName.split(' · ')[0]}:</span>{' '}
          {summary.unscored.map((row) => phrase(row)).join(' · ')}
        </p>
      )}
    </div>
  )
}
