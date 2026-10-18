import { Suspense, use, useState, type ReactNode, type WheelEvent } from 'react'
import { cachedImageUrl } from '../../../shared/imageCache'
import { currencyArt } from '../../../shared/item/art'
import type { ParsedItem } from '../../../shared/item/types'
import type { CurrencyEntry, ExchangeGroup } from '../../../shared/trade/currency'
import { formatAmount, stackSize, type CurrencyWorthResult } from '../../../shared/trade/exchange'
import { exchangeCatalog, flipWorth, refreshWorth, retryWorth, showWorthIn, type WorthState } from '../overlayStore'
import { Pips } from './EvaluateView'
import { ItemArt } from './ItemArt'

interface Props {
  item: ParsedItem
  text: string
  worth: WorthState
  flipped: boolean
}

type Worth = Extract<CurrencyWorthResult, { ok: true }>

export function CurrencyView({ item, text, worth, flipped }: Props) {
  const [picking, setPicking] = useState(false)
  const { target, loading, result } = worth
  const name = item.baseType ?? item.name
  const stack = stackSize(text)
  const shown = result?.ok && !loading ? result : null
  const itemId = result?.ok ? result.item.id : undefined
  const current = shown ? shown.target.id : target

  return (
    <section className="window ember currency">
      <span className="ember-corner" data-corner="tl" aria-hidden />
      <span className="ember-corner" data-corner="bl" aria-hidden />
      <span className="ember-corner" data-corner="br" aria-hidden />

      <header className="ember-tabs">
        <span />
        <h3 className="ember-plate">
          <span>Exchange</span>
        </h3>
        <span />
      </header>

      <div className="currency-pair" data-flipped={flipped}>
        <figure className="ember-slot currency-mine">
          <figcaption>You have</figcaption>
          <span className="currency-stack">
            <Art src={result?.ok ? result.item.image : undefined} fallback={<ItemArt item={item} />} />
            {stack && <b>{stack.count.toLocaleString('en-US')}</b>}
          </span>
          <strong className="currency-name" data-rarity={item.rarity === 'Gem' ? 'gem' : 'currency'}>
            {result?.ok ? (result.item.text ?? name) : name}
          </strong>
          <small>{result?.ok ? result.group : stack?.max ? `Stack ${stack.count} / ${stack.max}` : ' '}</small>
        </figure>

        <div className="currency-ratio" data-searching={loading}>
          <Ratio worth={worth} flipped={flipped} />
        </div>

        <Suspense fallback={<TargetSlot entry={shown ? shown.target : { id: target }} flipped={flipped} />}>
          <CyclingTarget
            flipped={flipped}
            current={current}
            fallback={shown ? shown.target : { id: target }}
            exclude={itemId}
            onOpen={() => setPicking(!picking)}
          />
        </Suspense>
      </div>

      {picking && (
        <Suspense fallback={<p className="ember-message">Loading currencies…</p>}>
          <CurrencyGrid
            current={current}
            exclude={itemId}
            onPick={(id) => {
              setPicking(false)
              showWorthIn(id)
            }}
          />
        </Suspense>
      )}

      <p className="currency-hint">
        Scroll the currency to change it, Shift skips a group, click it for the list, ⇄ swaps
      </p>

      {shown && <Ledger worth={shown} stack={stack} flipped={flipped} />}
      {shown && <PricesTime updatedAt={shown.updatedAt} />}

      <footer className="ember-links">
        <span className="currency-league">{shown ? [shown.league, traded(shown)].filter(Boolean).join(' · ') : ''}</span>
        {result?.url && (
          <button type="button" className="panel-link" onClick={() => void window.overlay.openTrade(result.url!)}>
            poe.ninja ↗
          </button>
        )}
      </footer>
    </section>
  )
}

const traded = ({ rate }: Worth) => (rate.traded !== undefined ? `${formatAmount(rate.traded)} traded` : '')

function PricesTime({ updatedAt }: { updatedAt: number }) {
  const minutes = Math.floor((Date.now() - updatedAt) / 60_000)
  const clock = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const ago = minutes < 1 ? 'just now' : minutes < 120 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} h ago`
  return (
    <p className="currency-time">
      <span title="When poe.ninja last read the in-game Currency Exchange">
        Prices from {clock} ({ago})
      </span>
      <button type="button" className="panel-link" title="Fetch the latest prices now" onClick={() => void refreshWorth()}>
        ↻ Refresh
      </button>
    </p>
  )
}

function Ratio({ worth: { loading, result }, flipped }: { worth: WorthState; flipped: boolean }) {
  if (!result || loading) {
    return (
      <span className="currency-loading" role="status">
        <span className="currency-spinner" aria-hidden />
        <small>Checking prices…</small>
      </span>
    )
  }
  if (!result.ok) {
    return (
      <>
        <p className="ember-message" data-error>
          {result.error}
        </p>
        <button type="button" className="panel-link" onClick={() => void retryWorth()}>
          Try again
        </button>
      </>
    )
  }
  const [from, to] = flipped ? [result.target, result.item] : [result.item, result.target]
  return (
    <>
      <span className="currency-one">1</span>
      <button
        type="button"
        className="currency-arrows"
        aria-pressed={flipped}
        title={`Swap: show what 1 ${to.text ?? to.id} is worth in ${from.text ?? from.id}`}
        onClick={flipWorth}
      >
        ⇄
      </button>
      <strong className="ember-value" title={`1 ${from.text ?? from.id} is worth this many ${to.text ?? to.id}`}>
        {formatAmount(flipped ? 1 / result.rate.value : result.rate.value)}
      </strong>
      <Pips reliability={result.rate.reliability} />
    </>
  )
}

interface CyclingProps {
  flipped: boolean
  current: string
  fallback: CurrencyEntry
  exclude: string | undefined
  onOpen: () => void
}

function CyclingTarget({ flipped, current, fallback, exclude, onOpen }: CyclingProps) {
  const groups = choicesOf(use(exchangeCatalog()), exclude)
  const choices = groups.flatMap((group) => group.entries.map((entry) => ({ group, entry })))
  const index = choices.findIndex(({ entry }) => entry.id === current)
  const found = choices[index]

  const onWheel = (event: WheelEvent) => {
    if (choices.length === 0) return
    const step = event.deltaY > 0 ? 1 : -1
    if (!event.shiftKey || !found) {
      showWorthIn(choices[(Math.max(index, 0) + step + choices.length) % choices.length].entry.id)
      return
    }
    const next = groups[(groups.indexOf(found.group) + step + groups.length) % groups.length]
    showWorthIn(next.entries[0].id)
  }

  return (
    <TargetSlot
      flipped={flipped}
      entry={found?.entry ?? fallback}
      place={
        found && `${found.group.label} · ${found.group.entries.indexOf(found.entry) + 1}/${found.group.entries.length}`
      }
      onWheel={onWheel}
      onClick={onOpen}
    />
  )
}

interface TargetSlotProps {
  flipped: boolean
  entry: CurrencyEntry
  place?: string
  onWheel?: (event: WheelEvent) => void
  onClick?: () => void
}

function TargetSlot({ flipped, entry, place, onWheel, onClick }: TargetSlotProps) {
  return (
    <button
      type="button"
      className="ember-slot currency-target"
      onWheel={onWheel}
      onClick={onClick}
      title="Scroll to change the currency (Shift skips a group). Click to see them all."
    >
      <figcaption>{flipped ? 'Price of' : 'Worth in'}</figcaption>
      <Art src={entry.image ?? currencyArt(entry.id)} />
      <strong className="currency-name">{entry.text ?? entry.id}</strong>
      <small>{place ?? ' '}</small>
      <span className="currency-wheel" aria-hidden>
        ▲<br />▼
      </span>
    </button>
  )
}

interface GridProps {
  current: string
  exclude: string | undefined
  onPick: (id: string) => void
}

function CurrencyGrid({ current, exclude, onPick }: GridProps) {
  const groups = choicesOf(use(exchangeCatalog()), exclude)
  const [shown, setShown] = useState(
    () => groups.find((group) => group.entries.some((entry) => entry.id === current))?.id ?? groups[0]?.id,
  )
  const group = groups.find(({ id }) => id === shown) ?? groups[0]
  if (!group) return <p className="ember-message">Couldn't load the currency list.</p>

  return (
    <div className="currency-grid-panel">
      <div className="currency-group-tabs" role="tablist">
        {groups.map(({ id, label }) => (
          <button key={id} type="button" role="tab" aria-selected={id === group.id} onClick={() => setShown(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="currency-grid">
        {group.entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            title={entry.text ?? entry.id}
            aria-pressed={entry.id === current}
            onClick={() => onPick(entry.id)}
          >
            <Art src={entry.image} />
            <span>{entry.text ?? entry.id}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const choicesOf = (groups: ExchangeGroup[], exclude: string | undefined): ExchangeGroup[] =>
  groups
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => entry.id !== exclude),
    }))
    .filter((group) => group.entries.length > 0)

function Ledger({ worth, stack, flipped }: { worth: Worth; stack: ReturnType<typeof stackSize>; flipped: boolean }) {
  const { rate, item, target } = worth
  return (
    <dl className="currency-ledger">
      {stack && stack.count > 1 && (
        <div>
          <dt>Your stack of {stack.count.toLocaleString('en-US')}</dt>
          <dd>
            <Amount value={rate.value * stack.count} entry={target} />
          </dd>
        </div>
      )}
      {stack?.max && stack.max !== stack.count && (
        <div>
          <dt>Full stack of {stack.max.toLocaleString('en-US')}</dt>
          <dd>
            <Amount value={rate.value * stack.max} entry={target} />
          </dd>
        </div>
      )}
      <div>
        <dt>1 {flipped ? (item.text ?? item.id) : (target.text ?? target.id)} buys</dt>
        <dd>
          {flipped ? <Amount value={rate.value} entry={target} /> : <Amount value={1 / rate.value} entry={item} />}
        </dd>
      </div>
    </dl>
  )
}

function Amount({ value, entry }: { value: number; entry: CurrencyEntry }) {
  return (
    <span className="ember-amount">
      <Art src={entry.image ?? currencyArt(entry.id)} icon />
      <span>{formatAmount(value)}</span>
    </span>
  )
}

function Art({
  src,
  fallback = null,
  icon = false,
}: {
  src: string | undefined
  fallback?: ReactNode
  icon?: boolean
}) {
  const url = cachedImageUrl(src)
  if (!url) return fallback
  return (
    <img
      className={icon ? undefined : 'item-art'}
      src={url}
      alt=""
      draggable={false}
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  )
}
