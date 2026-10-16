import { useState, type ChangeEvent, type CSSProperties, type MouseEvent } from 'react'
import { currencyArt } from '../../../shared/item/art'
import type { ParsedItem } from '../../../shared/item/types'
import { formatNumber } from '../../../shared/compare/stats'
import type { CurrencyIcons } from '../../../shared/trade/currency'
import { estimate, formatAge, formatPrice, type Price, type PriceCheckResult, type Reliability } from '../../../shared/trade/price'
import {
  BROAD_SCALE,
  CORRUPTED_OPTIONS,
  CURRENCY_OPTIONS,
  LISTED_OPTIONS,
  RARITY_OPTIONS,
  SCALE_LIMIT,
  SCALE_STEP,
  STATUS_OPTIONS,
  type ItemSearch,
  type SearchFilter,
} from '../../../shared/trade/query'
import { useCountdown } from '../countdown'
import { ItemArt } from './ItemArt'
import { ItemCard } from './ItemCard'
import {
  closeEvaluate,
  runSearch,
  setSearchScale,
  updateFilter,
  updateSearch,
  type EvaluateState,
} from '../overlayStore'

type OpenEvaluate = Exclude<EvaluateState, { status: 'closed' }>
type Tab = 'filters' | 'listings'

const EMBERS = 9

export function EvaluateView({ item, evaluate }: { item: ParsedItem; evaluate: OpenEvaluate }) {
  const [tab, setTab] = useState<Tab>('filters')
  const ready = evaluate.status === 'ready' ? evaluate : null
  const result = ready?.result ?? null
  const searching = ready?.searching ?? false
  const listings = result?.ok ? result.listings : []
  const wait = useCountdown(result?.ok === false ? result.retryAt : undefined)
  const tradeUrl = result?.url

  return (
    <form
      className="window ember"
      onSubmit={(event) => {
        event.preventDefault()
        void runSearch()
      }}
    >
      <span className="ember-corner" data-corner="tl" aria-hidden />
      <span className="ember-corner" data-corner="bl" aria-hidden />
      <span className="ember-corner" data-corner="br" aria-hidden />

      <nav className="ember-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'filters'} onClick={() => setTab('filters')}>
          Filters <span>{ready?.search.filters.filter((filter) => filter.enabled).length ?? 0}</span>
        </button>
        <h3 className="ember-plate">
          <span>Evaluate</span>
        </h3>
        <button type="button" role="tab" aria-selected={tab === 'listings'} onClick={() => setTab('listings')}>
          Listings <span>{listings.length}</span>
        </button>
      </nav>

      <div className="ember-top">
        <figure className="ember-slot">
          <figcaption>This item</figcaption>
          <ItemArt item={item} />
          <strong data-rarity={item.rarity.toLowerCase()}>{item.name || item.baseType}</strong>
          <small>
            {[item.name && item.baseType, item.itemLevel !== undefined && `iLvl ${item.itemLevel}`].filter(Boolean).join(' · ')}
          </small>
        </figure>
        <EstimateSlot evaluate={evaluate} searching={searching} wait={wait} />
      </div>

      <div className="ember-rule" aria-hidden>
        <span />
      </div>

      {ready &&
        (tab === 'filters' ? (
          <Filters search={ready.search} />
        ) : listings.length > 0 ? (
          <Listings listings={listings} icons={result?.ok ? result.icons : {}} />
        ) : (
          <p className="ember-empty">{result ? 'No listings for this search.' : 'Press Search to see what is listed.'}</p>
        ))}

      {ready && (
        <div className="ember-bottom">
          <div className="ember-presets" role="group" aria-label="Search preset">
            <button type="button" aria-pressed={ready.search.scale === 0} onClick={() => setSearchScale(0)}>
              Quick price
            </button>
            <button
              type="button"
              aria-pressed={ready.search.scale === BROAD_SCALE}
              onClick={() => setSearchScale(BROAD_SCALE)}
            >
              Broad (−10%)
            </button>
          </div>
          <button type="submit" className="ember-search" disabled={searching || wait > 0}>
            <span>{searching ? 'Searching' : wait > 0 ? `Wait ${wait}s` : 'Search'}</span>
          </button>
        </div>
      )}

      <footer className="ember-links">
        <button type="button" className="panel-link" onClick={closeEvaluate}>
          ← Compare
        </button>
        {tradeUrl && (
          <button type="button" className="panel-link" onClick={() => void window.overlay.openTrade(tradeUrl)}>
            Open on trade ↗
          </button>
        )}
      </footer>
    </form>
  )
}

interface EstimateProps {
  evaluate: OpenEvaluate
  searching: boolean
  wait: number
}

function EstimateSlot({ evaluate, searching, wait }: EstimateProps) {
  return (
    <div className="ember-estimate" data-searching={searching}>
      <EstimateBody evaluate={evaluate} searching={searching} wait={wait} />
    </div>
  )
}

function EstimateBody({ evaluate, searching, wait }: EstimateProps) {
  if (evaluate.status === 'preparing') return <p className="ember-message">Loading trade stats…</p>
  if (evaluate.status === 'unavailable') return <p className="ember-message" data-error>{evaluate.error}</p>

  const { result } = evaluate
  if (!result) return <p className="ember-message">{searching ? 'Searching the trade site…' : 'Press Search'}</p>
  if (!result.ok && result.retryAt !== undefined) {
    return wait > 0 ? (
      <>
        <small>Slow down</small>
        <strong className="ember-value" role="timer">
          {wait}s
        </strong>
        <span className="ember-range">The trade site asked us to wait before searching again.</span>
      </>
    ) : (
      <p className="ember-message">Ready. Press Search again.</p>
    )
  }
  if (!result.ok) return <p className="ember-message" data-error>{result.error}</p>

  const value = estimate(result.listings, result.total)
  if (!value) return <p className="ember-message">Nothing listed. Untick some filters or lower the minimums.</p>

  return (
    <>
      <small title="The middle of the cheapest matching listings on the trade site. Reliability goes up with more listings.">
        Worth about
      </small>
      <strong className="ember-value">
        <Amount price={value.value} icons={result.icons} />
      </strong>
      <span className="ember-embers" aria-hidden>
        {Array.from({ length: EMBERS }, (_, index) => (
          <i key={index} style={{ left: `${8 + index * 10}%`, animationDelay: `${(index * 0.37) % 2.4}s` }} />
        ))}
      </span>
      <span className="ember-range">
        <Amount price={value.low} icons={result.icons} /> – <Amount price={value.high} icons={result.icons} />
      </span>
      <Pips reliability={value.reliability} />
      <span className="ember-range">
        {result.listings.length} of {formatNumber(result.total)} · {result.league}
      </span>
    </>
  )
}

function Amount({ price, icons }: { price: Price; icons: CurrencyIcons }) {
  const icon = icons[price.currency] ?? currencyArt(price.currency)
  return (
    <span className="ember-amount">
      {icon && (
        <img
          src={icon}
          alt=""
          draggable={false}
          onError={(event) => {
            event.currentTarget.hidden = true
          }}
        />
      )}
      <span>{formatPrice(price)}</span>
    </span>
  )
}

const PIPS: Record<Reliability, number> = { 'Very low': 1, Low: 2, Medium: 3, High: 4 }

function Pips({ reliability }: { reliability: Reliability }) {
  return (
    <span className="ember-pips" title={`Reliability ${reliability.toLowerCase()}`} aria-label={`Reliability ${reliability}`}>
      {[1, 2, 3, 4].map((pip) => (
        <span key={pip} data-on={pip <= PIPS[reliability]} />
      ))}
    </span>
  )
}

function Filters({ search }: { search: ItemSearch }) {
  const properties = search.filters.filter((filter) => filter.kind === 'property')
  const mods = search.filters.filter((filter) => filter.kind !== 'property')
  return (
    <>
      <div className="ember-options">
        <Select value={search.rarity} options={RARITY_OPTIONS} onChange={(rarity) => updateSearch({ rarity })} />
        <Select value={search.corrupted} options={CORRUPTED_OPTIONS} onChange={(corrupted) => updateSearch({ corrupted })} />
        <Select value={search.currency} options={CURRENCY_OPTIONS} onChange={(currency) => updateSearch({ currency })} />
        <Select value={search.status} options={STATUS_OPTIONS} onChange={(status) => updateSearch({ status })} />
        <Select value={search.listed} options={LISTED_OPTIONS} onChange={(listed) => updateSearch({ listed })} />
      </div>
      <ul className="ember-ledger">
        {properties.map((filter) => (
          <FilterRow key={filter.key} filter={filter} />
        ))}
        {properties.length > 0 && mods.length > 0 && <li className="ember-divider" aria-hidden />}
        {mods.map((filter) => (
          <FilterRow key={filter.key} filter={filter} />
        ))}
      </ul>
      <div className="ember-scale">
        <button type="button" onClick={() => setSearchScale(search.scale - SCALE_STEP)} aria-label="Lower minimums by 5%">
          −
        </button>
        <input
          type="range"
          min={-SCALE_LIMIT}
          max={SCALE_LIMIT}
          step={SCALE_STEP}
          value={search.scale}
          aria-label="Scale every minimum"
          aria-valuetext={scaleLabel(search.scale)}
          style={{ '--fill': `${((search.scale + SCALE_LIMIT) / (2 * SCALE_LIMIT)) * 100}%` } as CSSProperties}
          onChange={(event) => setSearchScale(Number(event.target.value))}
        />
        <button type="button" onClick={() => setSearchScale(search.scale + SCALE_STEP)} aria-label="Raise minimums by 5%">
          +
        </button>
        <button
          type="button"
          className="ember-scale-label"
          data-exact={search.scale === 0}
          title="Back to exact match"
          onClick={() => setSearchScale(0)}
        >
          {scaleLabel(search.scale)}
        </button>
      </div>
    </>
  )
}

const scaleLabel = (scale: number) => (scale === 0 ? 'Exact match' : `${scale > 0 ? '+' : '−'}${Math.abs(scale)}%`)

const numberFrom = (event: ChangeEvent<HTMLInputElement>) => {
  if (event.target.value === '') return null
  const value = Number(event.target.value)
  return Number.isFinite(value) ? value : undefined
}

function FilterRow({ filter }: { filter: SearchFilter }) {
  const searchable = filter.kind !== 'unsearchable'
  const origin = filter.kind === 'mod' || filter.kind === 'unsearchable' ? filter : undefined
  return (
    <li
      data-kind={filter.kind}
      data-type={origin?.modType}
      data-enabled={filter.enabled}
      title={searchable ? undefined : 'The trade site has no filter for this mod'}
    >
      <label>
        <input
          type="checkbox"
          className="ember-check"
          checked={filter.enabled}
          disabled={!searchable}
          onChange={(event) => updateFilter(filter.key, { enabled: event.target.checked })}
        />
        <span className="ember-stat">
          {origin?.affix && (
            <span
              className="item-tier"
              data-best={origin.tier !== undefined && origin.tier <= 2}
              title={`${origin.affix === 'prefix' ? 'Prefix' : 'Suffix'}${origin.tier === undefined ? '' : `, tier ${origin.tier}`}`}
            >
              {origin.affix === 'prefix' ? 'P' : 'S'}
              {origin.tier}
            </span>
          )}
          {filter.kind === 'pseudo' && (
            <span className="item-tier" title="Adds up every mod that gives this, like the trade site's pseudo stats">
              Σ
            </span>
          )}
          {filter.label}
          {filter.kind === 'property' && <span className="ember-property"> {formatNumber(filter.value)}</span>}
        </span>
      </label>
      {searchable && (
        <>
          <input
            type="number"
            step="any"
            className="ember-number"
            placeholder="min"
            aria-label={`${filter.label} minimum`}
            value={filter.min ?? ''}
            onChange={(event) => {
              const min = numberFrom(event)
              if (min !== undefined) updateFilter(filter.key, { min, enabled: true })
            }}
          />
          <input
            type="number"
            step="any"
            className="ember-number"
            placeholder="max"
            aria-label={`${filter.label} maximum`}
            value={filter.max ?? ''}
            onChange={(event) => {
              const max = numberFrom(event)
              if (max !== undefined) updateFilter(filter.key, { max, enabled: true })
            }}
          />
        </>
      )}
    </li>
  )
}

type Listing = Extract<PriceCheckResult, { ok: true }>['listings'][number]

interface Preview {
  index: number
  placement: { top: number } | { bottom: number }
}

const PREVIEW_GAP = 6

function placeBeside(row: HTMLElement): Preview['placement'] {
  const { top, bottom } = row.getBoundingClientRect()
  return top > window.innerHeight / 2 ? { bottom: window.innerHeight - top + PREVIEW_GAP } : { top: bottom + PREVIEW_GAP }
}

function Listings({ listings, icons }: { listings: Listing[]; icons: CurrencyIcons }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const now = Date.now()
  const previewed = preview && listings[preview.index]?.item
  const show = (index: number) => (event: MouseEvent<HTMLLIElement>) =>
    setPreview({ index, placement: placeBeside(event.currentTarget) })

  return (
    <div className="ember-listings" onMouseLeave={() => setPreview(null)}>
      <ol>
        {listings.map((listing, index) => (
          <li key={index} data-previewed={preview?.index === index} onMouseEnter={show(index)}>
            <strong>
              <Amount price={listing} icons={icons} />
            </strong>
            <span>iLvl {listing.itemLevel ?? '–'}</span>
            <span>{listing.quality ?? 0}%</span>
            <span className="ember-seller">{listing.account ?? '–'}</span>
            <span>{formatAge(listing.indexed, now) ?? '–'}</span>
          </li>
        ))}
      </ol>
      {previewed && (
        <div className="window listing-preview" style={preview.placement}>
          <ItemCard item={previewed} />
        </div>
      )}
    </div>
  )
}

interface SelectProps<T extends string> {
  value: T
  options: Record<T, string>
  onChange: (value: T) => void
}

function Select<T extends string>({ value, options, onChange }: SelectProps<T>) {
  return (
    <select className="ember-select" value={value} onChange={(event) => onChange(event.target.value as T)}>
      {(Object.entries(options) as Array<[T, string]>).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  )
}
