import { useState, type ChangeEvent, type MouseEvent } from 'react'
import { formatNumber } from '../../../shared/compare/stats'
import { estimate, formatAge, formatPrice, type PriceCheckResult } from '../../../shared/trade/price'
import {
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
import { ItemCard } from './ItemCard'
import {
  closeEvaluate,
  runSearch,
  setSearchScale,
  updateFilter,
  updateSearch,
  type EvaluateState,
} from '../overlayStore'

export function EvaluateView({ evaluate }: { evaluate: Exclude<EvaluateState, { status: 'closed' }> }) {
  return (
    <section className="evaluate">
      <header className="evaluate-head">
        <strong>⚖ Evaluate</strong>
        <button type="button" className="panel-link" onClick={closeEvaluate}>
          ← Compare
        </button>
      </header>
      {evaluate.status === 'preparing' && <p className="evaluate-note">Loading trade stats…</p>}
      {evaluate.status === 'unavailable' && <p className="evaluate-error">{evaluate.error}</p>}
      {evaluate.status === 'ready' && (
        <SearchForm search={evaluate.search} searching={evaluate.searching} result={evaluate.result} />
      )}
    </section>
  )
}

interface FormProps {
  search: ItemSearch
  searching: boolean
  result: PriceCheckResult | null
}

function SearchForm({ search, searching, result }: FormProps) {
  const properties = search.filters.filter((filter) => filter.kind === 'property')
  const mods = search.filters.filter((filter) => filter.kind !== 'property')
  const tradeUrl = result?.url
  const wait = useCountdown(result?.ok === false ? result.retryAt : undefined)

  return (
    <form
      className="evaluate-form"
      onSubmit={(event) => {
        event.preventDefault()
        void runSearch()
      }}
    >
      <div className="evaluate-selects">
        <Select
          value={search.rarity}
          options={RARITY_OPTIONS}
          onChange={(rarity) => updateSearch({ rarity })}
        />
        <Select
          value={search.corrupted}
          options={CORRUPTED_OPTIONS}
          onChange={(corrupted) => updateSearch({ corrupted })}
        />
      </div>
      <ul className="evaluate-filters">
        {properties.map((filter) => (
          <FilterRow key={filter.key} filter={filter} />
        ))}
        {properties.length > 0 && mods.length > 0 && <li className="evaluate-divider" aria-hidden />}
        {mods.map((filter) => (
          <FilterRow key={filter.key} filter={filter} />
        ))}
      </ul>
      <div className="evaluate-scale">
        <button type="button" className="panel-link" onClick={() => setSearchScale(search.scale - SCALE_STEP)} aria-label="Lower minimums by 5%">
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
          onChange={(event) => setSearchScale(Number(event.target.value))}
        />
        <button type="button" className="panel-link" onClick={() => setSearchScale(search.scale + SCALE_STEP)} aria-label="Raise minimums by 5%">
          +
        </button>
        <button
          type="button"
          className="evaluate-scale-label panel-link"
          data-exact={search.scale === 0}
          title="Back to exact match"
          onClick={() => setSearchScale(0)}
        >
          {scaleLabel(search.scale)}
        </button>
      </div>
      <EstimateBox searching={searching} result={result} wait={wait} />
      <div className="evaluate-selects">
        <Select
          value={search.currency}
          options={CURRENCY_OPTIONS}
          onChange={(currency) => updateSearch({ currency })}
        />
        <Select
          value={search.status}
          options={STATUS_OPTIONS}
          onChange={(status) => updateSearch({ status })}
        />
        <Select
          value={search.listed}
          options={LISTED_OPTIONS}
          onChange={(listed) => updateSearch({ listed })}
        />
      </div>
      <div className="evaluate-actions">
        <button type="submit" className="evaluate-search" disabled={searching || wait > 0}>
          {searching ? 'Searching…' : wait > 0 ? `Wait ${wait}s` : 'Search'}
        </button>
        {tradeUrl && (
          <button type="button" className="panel-link" onClick={() => void window.overlay.openTrade(tradeUrl)}>
            Open on trade ↗
          </button>
        )}
      </div>
      {result?.ok && result.listings.length > 0 && <Listings result={result} />}
    </form>
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
  return (
    <li
      className="evaluate-filter"
      data-kind={filter.kind}
      data-type={filter.kind === 'property' ? undefined : filter.modType}
      data-enabled={filter.enabled}
      title={searchable ? undefined : 'The trade site has no filter for this mod'}
    >
      <label>
        <input
          type="checkbox"
          checked={filter.enabled}
          disabled={!searchable}
          onChange={(event) => updateFilter(filter.key, { enabled: event.target.checked })}
        />
        <span>
          {filter.label}
          {filter.kind === 'property' && <span className="evaluate-value"> {formatNumber(filter.value)}</span>}
        </span>
      </label>
      {searchable && (
        <>
          <input
            type="number"
            step="any"
            className="evaluate-number"
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
            className="evaluate-number"
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

interface EstimateProps {
  searching: boolean
  result: PriceCheckResult | null
  wait: number
}

function EstimateBox({ searching, result, wait }: EstimateProps) {
  if (!result) {
    return <div className="evaluate-estimate evaluate-note">{searching ? 'Searching the trade site…' : 'Press Search'}</div>
  }
  if (!result.ok && result.retryAt !== undefined) {
    return wait > 0 ? (
      <div className="evaluate-estimate evaluate-error" role="timer">
        The trade site asked us to slow down. You can search again in {wait}s.
      </div>
    ) : (
      <div className="evaluate-estimate evaluate-note">Ready. Press Search again.</div>
    )
  }
  if (!result.ok) return <div className="evaluate-estimate evaluate-error">{result.error}</div>

  const value = estimate(result.listings, result.total)
  if (!value) {
    return (
      <div className="evaluate-estimate evaluate-note">
        Nothing listed. Untick some filters or lower the minimums.
      </div>
    )
  }
  return (
    <div className="evaluate-estimate" data-searching={searching}>
      <small title="The middle of the cheapest matching listings on the trade site. Reliability goes up with more listings.">
        Estimated value · {result.league}
      </small>
      <strong>≈ {formatPrice(value.value)}</strong>
      <span className="evaluate-note">
        Range {formatPrice(value.low)} – {formatPrice(value.high)} · Reliability{' '}
        <span data-reliability={value.reliability}>{value.reliability}</span>
      </span>
      <span className="evaluate-note">
        {result.listings.length} of {result.total} listed
      </span>
    </div>
  )
}

interface Preview {
  index: number
  placement: { top: number } | { bottom: number }
}

const PREVIEW_GAP = 6

function placeBeside(row: HTMLElement): Preview['placement'] {
  const { top, bottom } = row.getBoundingClientRect()
  return top > window.innerHeight / 2 ? { bottom: window.innerHeight - top + PREVIEW_GAP } : { top: bottom + PREVIEW_GAP }
}

function Listings({ result }: { result: Extract<PriceCheckResult, { ok: true }> }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const now = Date.now()
  const previewed = preview && result.listings[preview.index]?.item
  const show = (index: number) => (event: MouseEvent<HTMLTableRowElement>) =>
    setPreview({ index, placement: placeBeside(event.currentTarget) })

  return (
    <div className="evaluate-listings" onMouseLeave={() => setPreview(null)}>
      <table>
        <thead>
          <tr>
            <th scope="col">Price</th>
            <th scope="col">iLvl</th>
            <th scope="col">Q%</th>
            <th scope="col">Seller</th>
            <th scope="col">Listed</th>
          </tr>
        </thead>
        <tbody>
          {result.listings.map((listing, index) => (
            <tr key={index} data-previewed={preview?.index === index} onMouseEnter={show(index)}>
              <td>{formatPrice(listing)}</td>
              <td>{listing.itemLevel ?? '–'}</td>
              <td>{listing.quality ?? 0}%</td>
              <td className="evaluate-seller">{listing.account ?? '–'}</td>
              <td>{formatAge(listing.indexed, now) ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <select className="evaluate-select" value={value} onChange={(event) => onChange(event.target.value as T)}>
      {(Object.entries(options) as Array<[T, string]>).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  )
}
