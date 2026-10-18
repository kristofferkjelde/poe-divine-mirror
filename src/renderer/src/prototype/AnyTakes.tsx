import { useState, type ReactNode, type WheelEvent } from 'react'
import { byId, CATALOG, DEFAULT_PINS, formatAmount, GROUPS, LEAGUE, rate, type Currency, type Group, type Hovered } from './catalog'

const EMBERS = 9

function Frame({ children, item, target }: { children: ReactNode; item: Hovered; target: Currency }) {
  return (
    <div className="window ember cw">
      <span className="ember-corner" data-corner="tl" aria-hidden />
      <span className="ember-corner" data-corner="bl" aria-hidden />
      <span className="ember-corner" data-corner="br" aria-hidden />
      <nav className="ember-tabs cw-tabs">
        <span />
        <h3 className="ember-plate">
          <span>Exchange</span>
        </h3>
        <span />
      </nav>
      {children}
      <footer className="ember-links">
        <span className="cw-note">
          {LEAGUE} · {rate(item.currency, target).offers} offers
        </span>
        <button type="button" className="panel-link">
          Open currency exchange ↗
        </button>
      </footer>
    </div>
  )
}

function Slot({ item, caption = 'Your item' }: { item: Hovered; caption?: string }) {
  return (
    <figure className="ember-slot">
      <figcaption>{caption}</figcaption>
      <span className="cw-stack-art">
        <img className="item-art" src={item.currency.art} alt="" draggable={false} />
        {item.stack && <b>{item.stack}</b>}
      </span>
      <strong className="cw-currency-name" data-rarity={item.rarity}>
        {item.name}
      </strong>
      <small>{item.detail}</small>
    </figure>
  )
}

function Icon({ currency, size = 18 }: { currency: Currency; size?: number }) {
  return <img src={currency.art} alt="" draggable={false} width={size} height={size} className="cw-icon" />
}

export function Amount({ value, target }: { value: number; target: Currency }) {
  return (
    <span className="ember-amount">
      <Icon currency={target} />
      <span>{formatAmount(value)}</span>
    </span>
  )
}

function Embers() {
  return (
    <span className="ember-embers" aria-hidden>
      {Array.from({ length: EMBERS }, (_, index) => (
        <i key={index} style={{ left: `${8 + index * 10}%`, animationDelay: `${(index * 0.37) % 2.4}s` }} />
      ))}
    </span>
  )
}

function Pips({ on }: { on: number }) {
  return (
    <span className="ember-pips">
      {[1, 2, 3, 4].map((pip) => (
        <span key={pip} data-on={pip <= on} />
      ))}
    </span>
  )
}

function Worth({ item, target }: { item: Hovered; target: Currency }) {
  const value = rate(item.currency, target)
  return (
    <>
      <small>Worth each</small>
      <strong className="ember-value cw-big">
        <Amount value={value.value} target={target} />
      </strong>
      <Embers />
      <span className="ember-range">
        <Amount value={value.low} target={target} /> – <Amount value={value.high} target={target} />
      </span>
      <Pips on={value.reliability} />
      <span className="ember-range">in {target.name}s</span>
    </>
  )
}

function Ledger({ item, target }: { item: Hovered; target: Currency }) {
  const value = rate(item.currency, target).value
  return (
    <dl className="cw-ledger">
      {item.stack && item.stack > 1 && (
        <div>
          <dt>Your stack of {item.stack}</dt>
          <dd>
            <Amount value={value * item.stack} target={target} />
          </dd>
        </div>
      )}
      {item.maxStack && item.maxStack !== item.stack && (
        <div>
          <dt>Full stack of {item.maxStack}</dt>
          <dd>
            <Amount value={value * item.maxStack} target={target} />
          </dd>
        </div>
      )}
      <div>
        <dt>1 {target.name} buys</dt>
        <dd>
          <span className="ember-amount">
            <Icon currency={item.currency} />
            <span>{formatAmount(1 / value)}</span>
          </span>
        </dd>
      </div>
    </dl>
  )
}

function CurrencyGrid({ exclude, current, onPick }: { exclude: string; current?: string; onPick: (id: string) => void }) {
  const [group, setGroup] = useState<Group>(() => (current ? byId(current).group : 'Orbs'))
  return (
    <div className="cw-grid-panel">
      <div className="cw-group-tabs" role="tablist">
        {GROUPS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={name === group} onClick={() => setGroup(name)}>
            {name}
          </button>
        ))}
      </div>
      <div className="cw-grid">
        {CATALOG.filter((currency) => currency.group === group && currency.id !== exclude).map((currency) => (
          <button
            key={currency.id}
            type="button"
            title={currency.name}
            aria-pressed={currency.id === current}
            onClick={() => onPick(currency.id)}
          >
            <Icon currency={currency} size={34} />
            <span>{currency.short}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const usable = (pins: string[], item: Hovered) => pins.filter((id) => id !== item.currency.id)

export const nameA = 'Pins + currency grid'

export function VariantA({ item }: { item: Hovered }) {
  const [pins, setPins] = useState(() => usable([...DEFAULT_PINS, 'annul'], item).slice(0, 3))
  const [target, setTarget] = useState(pins[0])
  const [open, setOpen] = useState(false)
  const pick = (id: string) => {
    setTarget(id)
    setOpen(false)
    if (!pins.includes(id)) setPins([...pins.slice(0, 2), id])
  }
  const currency = byId(target)
  return (
    <Frame item={item} target={currency}>
      <div className="ember-top">
        <Slot item={item} />
        <div className="ember-estimate">
          <Worth item={item} target={currency} />
        </div>
      </div>
      <div className="cw-picker">
        <span className="cw-label">Show in</span>
        <div className="ember-presets cw-tabs-row" role="group">
          {pins.map((id) => (
            <button key={id} type="button" aria-pressed={id === target} onClick={() => pick(id)}>
              <Icon currency={byId(id)} size={20} />
              {byId(id).short}
            </button>
          ))}
          <button type="button" aria-pressed={open} className="cw-more" onClick={() => setOpen(!open)} title="Any other currency">
            {open ? '✕' : '＋ More'}
          </button>
        </div>
      </div>
      {open && <CurrencyGrid exclude={item.currency.id} current={target} onPick={pick} />}
      <div className="ember-rule" aria-hidden>
        <span />
      </div>
      <Ledger item={item} target={currency} />
    </Frame>
  )
}

export const nameB = 'Trade pair'

export function VariantB({ item }: { item: Hovered }) {
  const choices = CATALOG.filter((currency) => currency.id !== item.currency.id)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const target = choices[index]
  const value = rate(item.currency, target)

  const onWheel = (event: WheelEvent) => {
    const step = event.deltaY > 0 ? 1 : -1
    if (!event.shiftKey) return setIndex((index + step + choices.length) % choices.length)
    const groups = GROUPS.filter((group) => choices.some((currency) => currency.group === group))
    const next = groups[(groups.indexOf(target.group) + step + groups.length) % groups.length]
    setIndex(choices.findIndex((currency) => currency.group === next))
  }

  return (
    <Frame item={item} target={target}>
      <div className="cw-pair">
        <Slot item={item} caption="You have" />
        <div className="cw-pair-ratio">
          <span>1</span>
          <i>⇄</i>
          <strong className="ember-value">{formatAmount(value.value)}</strong>
          <Pips on={value.reliability} />
        </div>
        <button type="button" className="ember-slot cw-target-slot" onWheel={onWheel} onClick={() => setOpen(!open)} title="Scroll to change currency (Shift skips a group). Click for all.">
          <figcaption>Worth in</figcaption>
          <img className="item-art" src={target.art} alt="" draggable={false} />
          <strong className="cw-currency-name">{target.name}</strong>
          <small>
            {target.group} · {choices.filter((currency) => currency.group === target.group).indexOf(target) + 1}/
            {choices.filter((currency) => currency.group === target.group).length}
          </small>
          <span className="cw-wheel-hint" aria-hidden>
            ▲<br />▼
          </span>
        </button>
      </div>
      {open && (
        <CurrencyGrid
          exclude={item.currency.id}
          current={target.id}
          onPick={(id) => {
            setIndex(choices.findIndex((currency) => currency.id === id))
            setOpen(false)
          }}
        />
      )}
      <p className="cw-hint">Scroll over the currency to change it, Shift skips a group, click to see them all</p>
      <Ledger item={item} target={target} />
    </Frame>
  )
}

export const nameC = 'Multi-currency ledger'

export function VariantC({ item }: { item: Hovered }) {
  const [rows, setRows] = useState(() => usable(DEFAULT_PINS, item))
  const [star, setStar] = useState(rows[0])
  const [adding, setAdding] = useState(false)
  const target = byId(star)
  return (
    <Frame item={item} target={target}>
      <div className="ember-top">
        <Slot item={item} />
        <div className="ember-estimate">
          <Worth item={item} target={target} />
        </div>
      </div>
      <div className="ember-rule" aria-hidden>
        <span />
      </div>
      <table className="cw-table">
        <thead>
          <tr>
            <th />
            <th>Each</th>
            <th>{item.stack && item.stack > 1 ? `Your ${item.stack}` : 'Buys'}</th>
            <th aria-label="Shown on top" />
          </tr>
        </thead>
        <tbody>
          {rows.map((id) => {
            const currency = byId(id)
            const value = rate(item.currency, currency).value
            return (
              <tr
                key={id}
                data-on={id === star}
                onClick={() => setStar(id)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  if (rows.length > 1) {
                    const rest = rows.filter((row) => row !== id)
                    setRows(rest)
                    if (id === star) setStar(rest[0])
                  }
                }}
                title="Click to show on top, right-click to remove"
              >
                <th>
                  <Icon currency={currency} size={22} />
                  {currency.name}
                </th>
                <td>{formatAmount(value)}</td>
                <td>{item.stack && item.stack > 1 ? formatAmount(value * item.stack) : formatAmount(1 / value)}</td>
                <td className="cw-star">{id === star ? '★' : '☆'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button type="button" className="cw-add-row" onClick={() => setAdding(!adding)}>
        {adding ? '✕ Close' : '＋ Add a currency'}
      </button>
      {adding && (
        <CurrencyGrid
          exclude={item.currency.id}
          onPick={(id) => {
            if (!rows.includes(id)) setRows([...rows, id])
            setStar(id)
            setAdding(false)
          }}
        />
      )}
      <p className="cw-hint">Click a row to show it on top, right-click to remove it. Your rows are remembered.</p>
    </Frame>
  )
}
