import { useState } from 'react'
import { formatNumber } from '../../../shared/compare/stats'
import { estimate, formatAge, formatPrice } from '../../../shared/trade/price'
import { toExalted } from './fixtures'
import { Pips, PRESETS, Tier } from './shared'
import type { VariantProps } from './types'
import { useSearchState } from './useSearchState'

export const name = 'Appraisal'

export function VariantA({ item, search: initial, result }: VariantProps) {
  const { search, toggle, setScale } = useSearchState(initial)
  const [showListings, setShowListings] = useState(false)
  const value = estimate(result.listings, result.total)!
  const prices = result.listings.map(toExalted)
  const low = Math.log(Math.min(...prices) * 0.8)
  const high = Math.log(Math.max(...prices) * 1.2)
  const at = (price: number) => `${((Math.log(price) - low) / (high - low)) * 100}%`

  return (
    <div className="window inventory ea">
      <h3 className="gold-plate ea-plate">
        <span>Appraisal</span>
      </h3>
      <p className="ea-item" data-rarity={item.rarity.toLowerCase()}>
        {item.name}
        <small>{item.baseType}</small>
      </p>

      <div className="item-slot-frame ea-price">
        <small>Estimated value · {result.league}</small>
        <strong>≈ {formatPrice(value.value)}</strong>
        <span>
          {formatPrice(value.low)} – {formatPrice(value.high)} · <Pips reliability={value.reliability} /> {value.reliability}
        </span>
        <div className="ea-spread" aria-label="Where the listings sit">
          {prices.map((price, index) => (
            <span key={index} className="ea-dot" style={{ left: at(price) }} />
          ))}
          <span className="ea-marker" style={{ left: at(toExalted(value.value)) }} />
        </div>
        <small>
          {result.listings.length} of {formatNumber(result.total)} listed
        </small>
      </div>

      <div className="ea-presets" role="group" aria-label="Search preset">
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" aria-pressed={search.scale === preset.scale} onClick={() => setScale(preset.scale)}>
            {preset.label}
          </button>
        ))}
      </div>

      <ul className="ea-chips">
        {search.filters.map((filter) => (
          <li key={filter.key}>
            <button type="button" aria-pressed={filter.enabled} onClick={() => toggle(filter.key)}>
              <Tier filter={filter} />
              {filter.label}
              {filter.min !== null && <em>≥ {formatNumber(filter.min)}</em>}
            </button>
          </li>
        ))}
      </ul>

      <div className="ea-actions">
        <button type="button" className="ea-search">
          Search again
        </button>
        <button type="button" className="panel-link">
          Open on trade ↗
        </button>
      </div>

      <button type="button" className="panel-link ea-toggle" aria-expanded={showListings} onClick={() => setShowListings(!showListings)}>
        {showListings ? 'Hide listings' : `Show ${result.listings.length} listings`}
      </button>
      {showListings && (
        <ol className="ea-listings">
          {result.listings.map((listing, index) => (
            <li key={index}>
              <strong>{formatPrice(listing)}</strong>
              <span>iLvl {listing.itemLevel}</span>
              <span>{listing.account}</span>
              <span>{formatAge(listing.indexed, Date.now())}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
