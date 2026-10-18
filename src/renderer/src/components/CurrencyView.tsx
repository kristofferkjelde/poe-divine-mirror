import { Suspense, use, useState, type ReactNode, type WheelEvent } from 'react'
import { cachedImageUrl } from '../../../shared/imageCache'
import { currencyArt } from '../../../shared/item/art'
import type { ParsedItem } from '../../../shared/item/types'
import type { CurrencyEntry, ExchangeGroup } from '../../../shared/trade/currency'
import { formatAmount, stackSize, type CurrencyWorthResult } from '../../../shared/trade/exchange'
import { exchangeCatalog, retryWorth, showWorthIn, type WorthState } from '../overlayStore'
import { Pips } from './EvaluateView'
import { ItemArt } from './ItemArt'

interface Props {
  item: ParsedItem
  text: string
  worth: WorthState
}

type Worth = Extract<CurrencyWorthResult, { ok: true }>

export function CurrencyView({ item, text, worth }: Props) {
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

      <div className="currency-pair">
        <figure className="ember-slot">
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
          <Ratio worth={worth} />
        </div>

        <Suspense fallback={<TargetSlot entry={shown ? shown.target : { id: target }} />}>
          <CyclingTarget
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

      <p className="currency-hint">Scroll over the currency to change it, Shift skips a group, click to see them all</p>

      {shown && <Ledger worth={shown} stack={stack} />}

      <footer className="ember-links">
        <span className="currency-league">
          {shown ? [shown.league, traded(shown), age(shown.updatedAt)].filter(Boolean).join(' · ') : ''}
        </span>
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

function age(updatedAt: number): string {
  const minutes = Math.floor((Date.now() - updatedAt) / 60_000)
  return minutes < 1 ? 'prices just now' : `prices ${minutes} min old`
}

function Ratio({ worth: { loading, result } }: { worth: WorthState }) {
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
  return (
    <>
      <span className="currency-one">1</span>
      <i className="currency-arrows" aria-hidden>
        ⇄
      </i>
      <strong
        className="ember-value"
        title={`1 ${result.item.text ?? result.item.id} is worth this many ${result.target.text ?? result.target.id}`}
      >
        {formatAmount(result.rate.value)}
      </strong>
      <Pips reliability={result.rate.reliability} />
    </>
  )
}

interface CyclingProps {
  current: string
  fallback: CurrencyEntry
  exclude: string | undefined
  onOpen: () => void
}

function CyclingTarget({ current, fallback, exclude, onOpen }: CyclingProps) {
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
  entry: CurrencyEntry
  place?: string
  onWheel?: (event: WheelEvent) => void
  onClick?: () => void
}

function TargetSlot({ entry, place, onWheel, onClick }: TargetSlotProps) {
  return (
    <button
      type="button"
      className="ember-slot currency-target"
      onWheel={onWheel}
      onClick={onClick}
      title="Scroll to change the currency (Shift skips a group). Click to see them all."
    >
      <figcaption>Worth in</figcaption>
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

function Ledger({ worth, stack }: { worth: Worth; stack: ReturnType<typeof stackSize> }) {
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
        <dt>1 {target.text ?? target.id} buys</dt>
        <dd>
          <Amount value={1 / rate.value} entry={item} />
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
