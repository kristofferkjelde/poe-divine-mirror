import { useState, type ReactNode } from 'react'
import { formatNumber } from '../../../shared/compare/stats'
import { estimate, formatAge, formatPrice, type Estimate } from '../../../shared/trade/price'
import { ItemCard } from '../components/ItemCard'
import { PRESETS, Tier } from './shared'
import type { VariantProps } from './types'
import { useSearchState } from './useSearchState'

const ROW = 32

export type Theme = 'reliquary' | 'ember' | 'arcane'

interface Props extends VariantProps {
  theme: Theme
  renderEstimate: (value: Estimate, listed: string) => ReactNode
}

export function LedgerTabs({ theme, item, search: initial, result, renderEstimate }: Props) {
  const { search, toggle, setScale } = useSearchState(initial)
  const [tab, setTab] = useState<'filters' | 'listings'>('filters')
  const [hovered, setHovered] = useState<number | null>(null)
  const value = estimate(result.listings, result.total)!
  const preview = hovered === null ? null : result.listings[hovered]?.item
  const enabled = search.filters.filter((filter) => filter.enabled).length

  return (
    <div className="lt" data-theme={theme}>
      <span className="lt-corner" data-corner="tl" aria-hidden />
      <span className="lt-corner" data-corner="tr" aria-hidden />
      <span className="lt-corner" data-corner="bl" aria-hidden />
      <span className="lt-corner" data-corner="br" aria-hidden />

      <nav className="lt-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'filters'} onClick={() => setTab('filters')}>
          Filters <span>{enabled}</span>
        </button>
        <h3 className="lt-plate">
          <span>Evaluate</span>
        </h3>
        <button type="button" role="tab" aria-selected={tab === 'listings'} onClick={() => setTab('listings')}>
          Listings <span>{result.listings.length}</span>
        </button>
      </nav>

      <div className="lt-top">
        <figure className="lt-slot">
          <figcaption>This item</figcaption>
          <RingIcon />
          <strong data-rarity={item.rarity.toLowerCase()}>{item.name}</strong>
          <small>
            {item.baseType} · iLvl {item.itemLevel}
          </small>
        </figure>
        <div className="lt-estimate">{renderEstimate(value, `${result.listings.length} of ${formatNumber(result.total)} · ${result.league}`)}</div>
      </div>

      <div className="lt-rule" aria-hidden>
        <span />
      </div>

      {tab === 'filters' ? (
        <ul className="lt-filters">
          {search.filters.map((filter) => (
            <li key={filter.key} data-enabled={filter.enabled}>
              <button
                type="button"
                role="checkbox"
                aria-checked={filter.enabled}
                aria-label={filter.label}
                className="lt-check"
                onClick={() => toggle(filter.key)}
              />
              <span className="lt-stat" onClick={() => toggle(filter.key)}>
                <Tier filter={filter} />
                {filter.label}
              </span>
              <input className="lt-input" defaultValue={filter.min ?? ''} aria-label={`${filter.label} minimum`} />
              <input className="lt-input" placeholder="max" aria-label={`${filter.label} maximum`} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="lt-listings" onMouseLeave={() => setHovered(null)}>
          <ol>
            {result.listings.map((listing, index) => (
              <li key={index} data-hovered={hovered === index} onMouseEnter={() => setHovered(index)}>
                <strong>{formatPrice(listing)}</strong>
                <span>iLvl {listing.itemLevel}</span>
                <span className="lt-seller">{listing.account}</span>
                <span>{formatAge(listing.indexed, Date.now())}</span>
              </li>
            ))}
          </ol>
          {preview && hovered !== null && (
            <div
              className="window lt-preview"
              style={hovered < 4 ? { top: (hovered + 1) * ROW + 6 } : { bottom: (result.listings.length - hovered) * ROW + 6 }}
            >
              <ItemCard item={preview} />
            </div>
          )}
        </div>
      )}

      <div className="lt-bottom">
        <div className="lt-presets" role="group" aria-label="Search preset">
          {PRESETS.map((preset) => (
            <button key={preset.label} type="button" aria-pressed={search.scale === preset.scale} onClick={() => setScale(preset.scale)}>
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" className="lt-search">
          <span>Search</span>
        </button>
      </div>
      <a className="lt-trade" href="#trade" onClick={(event) => event.preventDefault()}>
        Open on trade ↗
      </a>
    </div>
  )
}

function RingIcon() {
  return (
    <svg className="lt-icon" viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="lt-band" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--metal-hi)" />
          <stop offset="55%" stopColor="var(--metal-mid)" />
          <stop offset="100%" stopColor="var(--metal-lo)" />
        </linearGradient>
        <radialGradient id="lt-gem" cx="0.35" cy="0.3">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="35%" stopColor="var(--gem)" />
          <stop offset="100%" stopColor="var(--gem-deep)" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="38" rx="19" ry="17" fill="none" stroke="url(#lt-band)" strokeWidth="6" />
      <ellipse cx="32" cy="38" rx="19" ry="17" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1" />
      <path d="M24 20 L32 12 L40 20 L32 26 Z" fill="url(#lt-band)" />
      <circle cx="32" cy="18" r="5.5" fill="url(#lt-gem)" />
    </svg>
  )
}
