import { cachedImageUrl } from '../../../shared/imageCache'
import { currencyArt } from '../../../shared/item/art'
import type { ParsedItem } from '../../../shared/item/types'
import type { CurrencyIcons } from '../../../shared/trade/currency'
import {
  formatAmount,
  stackSize,
  TARGET_NAMES,
  targetsFor,
  type CurrencyWorthResult,
  type ExchangeTarget,
} from '../../../shared/trade/exchange'
import { useCountdown } from '../countdown'
import { retryWorth, showWorthIn, type WorthState } from '../overlayStore'
import { Embers, Pips } from './EvaluateView'
import { ItemArt } from './ItemArt'

const SHORT_NAMES: Record<ExchangeTarget, string> = { chaos: 'Chaos', exalted: 'Exalted', divine: 'Divine' }

interface Props {
  item: ParsedItem
  text: string
  worth: WorthState
}

export function CurrencyView({ item, text, worth }: Props) {
  const { target, loading, result } = worth
  const name = item.baseType ?? item.name
  const stack = stackSize(text)
  const icons = result?.ok ? result.icons : {}
  const shown = result?.ok && result.target === target ? result : null
  const url = result?.url

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

      <div className="ember-top">
        <figure className="ember-slot">
          <figcaption>Your currency</figcaption>
          <span className="currency-stack">
            <CurrencyArt item={item} icon={result?.ok ? icons[result.currency] : undefined} />
            {stack && <b>{stack.count.toLocaleString('en-US')}</b>}
          </span>
          <strong data-rarity="currency">{name}</strong>
          {stack && <small>{stack.max ? `Stack ${stack.count} / ${stack.max}` : `Stack ${stack.count}`}</small>}
        </figure>
        <div className="ember-estimate" data-searching={loading}>
          <WorthBody worth={worth} />
        </div>
      </div>

      <div className="currency-picker">
        <span>Show in</span>
        <div className="ember-presets" role="group" aria-label="Show the worth in">
          {targetsFor(name).map((option) => (
            <button key={option} type="button" aria-pressed={option === target} onClick={() => showWorthIn(option)}>
              <TargetIcon target={option} icons={icons} />
              {SHORT_NAMES[option]}
            </button>
          ))}
        </div>
      </div>

      {shown && (
        <>
          <div className="ember-rule" aria-hidden>
            <span />
          </div>
          <dl className="currency-ledger">
            {stack && stack.count > 1 && (
              <div>
                <dt>Your stack of {stack.count.toLocaleString('en-US')}</dt>
                <dd>
                  <Amount value={shown.rate.value * stack.count} target={target} icons={icons} />
                </dd>
              </div>
            )}
            {stack?.max && stack.max !== stack.count && (
              <div>
                <dt>Full stack of {stack.max.toLocaleString('en-US')}</dt>
                <dd>
                  <Amount value={shown.rate.value * stack.max} target={target} icons={icons} />
                </dd>
              </div>
            )}
            <div>
              <dt>1 {TARGET_NAMES[target]} buys</dt>
              <dd>
                <span className="ember-amount">
                  <CurrencyIcon src={icons[shown.currency]} />
                  <span>{formatAmount(1 / shown.rate.value)}</span>
                </span>
              </dd>
            </div>
          </dl>
        </>
      )}

      <footer className="ember-links">
        <span className="currency-league">{result?.ok ? result.league : ''}</span>
        {url && (
          <button type="button" className="panel-link" onClick={() => void window.overlay.openTrade(url)}>
            Open currency exchange ↗
          </button>
        )}
      </footer>
    </section>
  )
}

function WorthBody({ worth }: { worth: WorthState }) {
  const { target, loading, result } = worth
  const wait = useCountdown(result?.ok === false ? result.retryAt : undefined)

  if (!result || (loading && !(result.ok && result.target === target))) {
    return <p className="ember-message">Checking the currency exchange…</p>
  }
  if (!result.ok) return <Failed result={result} wait={wait} />

  const { rate, icons } = result
  return (
    <>
      <small title="The middle of the cheapest offers on the trade site's currency exchange">Worth each</small>
      <strong className="ember-value">
        <Amount value={rate.value} target={result.target} icons={icons} />
      </strong>
      <Embers />
      <span className="ember-range">
        <Amount value={rate.low} target={result.target} icons={icons} /> –{' '}
        <Amount value={rate.high} target={result.target} icons={icons} />
      </span>
      <Pips reliability={rate.reliability} />
      <span className="ember-range">
        {rate.offers.toLocaleString('en-US')} {rate.offers === 1 ? 'offer' : 'offers'}
      </span>
    </>
  )
}

function Failed({ result, wait }: { result: Extract<CurrencyWorthResult, { ok: false }>; wait: number }) {
  if (result.retryAt !== undefined && wait > 0) {
    return (
      <>
        <small>Slow down</small>
        <strong className="ember-value" role="timer">
          {wait}s
        </strong>
        <span className="ember-range">The trade site asked us to wait before checking again.</span>
      </>
    )
  }
  return (
    <>
      {result.retryAt === undefined && (
        <p className="ember-message" data-error>
          {result.error}
        </p>
      )}
      <button type="button" className="panel-link" onClick={() => void retryWorth()}>
        Try again
      </button>
    </>
  )
}

function Amount({ value, target, icons }: { value: number; target: ExchangeTarget; icons: CurrencyIcons }) {
  return (
    <span className="ember-amount">
      <TargetIcon target={target} icons={icons} />
      <span>{formatAmount(value)}</span>
    </span>
  )
}

const TargetIcon = ({ target, icons }: { target: ExchangeTarget; icons: CurrencyIcons }) => (
  <CurrencyIcon src={icons[target] ?? currencyArt(target)} />
)

function CurrencyIcon({ src }: { src: string | undefined }) {
  const url = cachedImageUrl(src)
  return url ? (
    <img
      src={url}
      alt=""
      draggable={false}
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  ) : null
}

function CurrencyArt({ item, icon }: { item: ParsedItem; icon: string | undefined }) {
  const url = cachedImageUrl(icon)
  return url ? <img className="item-art" src={url} alt="" draggable={false} /> : <ItemArt item={item} />
}
