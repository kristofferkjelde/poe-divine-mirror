import { useState } from 'react'
import { formatNumber } from '../../../shared/compare/stats'
import { estimate, formatAge, formatPrice } from '../../../shared/trade/price'
import { ItemCard } from '../components/ItemCard'
import { Pips, PRESETS, Tier } from './shared'
import type { VariantProps } from './types'
import { useSearchState } from './useSearchState'

export const name = 'Ledger tabs'

export function VariantB({ item, search: initial, result }: VariantProps) {
  const { search, toggle, setScale } = useSearchState(initial)
  const [tab, setTab] = useState<'filters' | 'listings'>('filters')
  const [hovered, setHovered] = useState<number | null>(null)
  const value = estimate(result.listings, result.total)!
  const preview = hovered === null ? null : result.listings[hovered]?.item

  return (
    <div className="window inventory eb">
      <nav className="decision-tabs eb-tabs">
        <button type="button" className="decision-tab" aria-pressed={tab === 'filters'} onClick={() => setTab('filters')}>
          Filters
        </button>
        <h3 className="gold-plate">
          <span>Evaluate</span>
        </h3>
        <button type="button" className="decision-tab" aria-pressed={tab === 'listings'} onClick={() => setTab('listings')}>
          Listings
        </button>
      </nav>

      <div className="eb-top">
        <figure className="item-slot-frame eb-slot">
          <figcaption>This item</figcaption>
          <span className="decision-glyph" aria-hidden>
            ◯
          </span>
          <strong data-rarity={item.rarity.toLowerCase()}>{item.name}</strong>
          <small>{item.baseType}</small>
        </figure>
        <div className="item-slot-frame eb-price">
          <small>Worth about</small>
          <strong>{formatPrice(value.value)}</strong>
          <span>
            {formatPrice(value.low)} – {formatPrice(value.high)}
          </span>
          <Pips reliability={value.reliability} />
          <small>
            {result.listings.length} of {formatNumber(result.total)} · {result.league}
          </small>
        </div>
      </div>

      {tab === 'filters' ? (
        <table className="decision-ledger eb-ledger">
          <thead>
            <tr>
              <th scope="col" aria-label="Use" />
              <th scope="col">Stat</th>
              <th scope="col">Min</th>
              <th scope="col">Max</th>
            </tr>
          </thead>
          <tbody>
            {search.filters.map((filter) => (
              <tr key={filter.key} data-enabled={filter.enabled}>
                <td>
                  <input type="checkbox" checked={filter.enabled} onChange={() => toggle(filter.key)} aria-label={filter.label} />
                </td>
                <td>
                  <Tier filter={filter} />
                  {filter.label}
                </td>
                <td>
                  <input className="evaluate-number" defaultValue={filter.min ?? ''} aria-label="Minimum" />
                </td>
                <td>
                  <input className="evaluate-number" placeholder="max" aria-label="Maximum" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="eb-listings-wrap" onMouseLeave={() => setHovered(null)}>
          <table className="decision-ledger eb-ledger">
            <thead>
              <tr>
                <th scope="col">Price</th>
                <th scope="col">iLvl</th>
                <th scope="col">Seller</th>
                <th scope="col">Listed</th>
              </tr>
            </thead>
            <tbody>
              {result.listings.map((listing, index) => (
                <tr key={index} data-hovered={hovered === index} onMouseEnter={() => setHovered(index)}>
                  <td className="decision-this">{formatPrice(listing)}</td>
                  <td>{listing.itemLevel}</td>
                  <td>{listing.account}</td>
                  <td>{formatAge(listing.indexed, Date.now())}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview && (
            <div className="window eb-preview">
              <ItemCard item={preview} />
            </div>
          )}
        </div>
      )}

      <div className="eb-bottom">
        <div className="evaluate-presets" role="group" aria-label="Search preset">
          {PRESETS.map((preset) => (
            <button key={preset.label} type="button" aria-pressed={search.scale === preset.scale} onClick={() => setScale(preset.scale)}>
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" className="evaluate-search">
          Search
        </button>
      </div>
    </div>
  )
}
