import { formatNumber } from '../../../shared/compare/stats'
import { estimate, formatPrice } from '../../../shared/trade/price'
import { toExalted } from './fixtures'
import { Diamond, Pips, PRESETS, Tier } from './shared'
import type { VariantProps } from './types'
import { useSearchState } from './useSearchState'

export const name = 'Market steps'

const BUCKETS = [0.5, 1, 2, 5, 10, 25, Infinity]
const bucketLabel = (index: number) =>
  index === 0 ? `< ${BUCKETS[0]}` : BUCKETS[index] === Infinity ? `${BUCKETS[index - 1]}+` : `${BUCKETS[index - 1]}–${BUCKETS[index]}`

export function VariantC({ item, search: initial, result }: VariantProps) {
  const { search, toggle, setScale } = useSearchState(initial)
  const value = estimate(result.listings, result.total)!
  const counts = BUCKETS.map(() => 0)
  for (const listing of result.listings) counts[BUCKETS.findIndex((limit) => toExalted(listing) < limit)]++
  const most = Math.max(...counts)
  const estimateBucket = BUCKETS.findIndex((limit) => toExalted(value.value) < limit)

  return (
    <div className="window inventory ec">
      <header className="ec-head">
        <span className="decision-glyph" aria-hidden>
          ◯
        </span>
        <div>
          <strong data-rarity={item.rarity.toLowerCase()}>{item.name}</strong>
          <small>
            {item.baseType} · iLvl {item.itemLevel}
          </small>
        </div>
      </header>

      <section className="ec-step">
        <h4>
          <Diamond /> What matters
        </h4>
        <ul className="ec-checks">
          {search.filters.map((filter) => (
            <li key={filter.key}>
              <label data-enabled={filter.enabled}>
                <input type="checkbox" checked={filter.enabled} onChange={() => toggle(filter.key)} />
                <span>
                  <Tier filter={filter} />
                  {filter.label}
                </span>
                <em>{filter.min === null ? '' : `≥ ${formatNumber(filter.min)}`}</em>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="ec-step">
        <h4>
          <Diamond /> How strict
        </h4>
        <div className="ec-strict">
          {PRESETS.map((preset) => (
            <button key={preset.label} type="button" aria-pressed={search.scale === preset.scale} onClick={() => setScale(preset.scale)}>
              {preset.label}
            </button>
          ))}
          <input type="range" min={-50} max={50} step={5} value={search.scale} onChange={(event) => setScale(Number(event.target.value))} aria-label="Scale every minimum" />
        </div>
      </section>

      <section className="ec-step">
        <h4>
          <Diamond /> The market
        </h4>
        <div className="ec-verdict">
          <strong>≈ {formatPrice(value.value)}</strong>
          <span>
            {formatPrice(value.low)} – {formatPrice(value.high)} · <Pips reliability={value.reliability} />
          </span>
        </div>
        <div className="ec-bars" role="img" aria-label="Listings by price in exalted orbs">
          {counts.map((count, index) => (
            <div key={index} className="ec-bar" data-estimate={index === estimateBucket}>
              <span style={{ height: `${(count / most) * 100}%` }}>{count > 0 && count}</span>
              <small>{bucketLabel(index)}</small>
            </div>
          ))}
        </div>
        <p className="inv-note">
          Cheapest {result.listings.length} of {formatNumber(result.total)} listed, in exalted · {result.league}
        </p>
      </section>

      <div className="ec-actions">
        <button type="button" className="evaluate-search">
          Search
        </button>
        <button type="button" className="panel-link">
          Open on trade ↗
        </button>
      </div>
    </div>
  )
}
