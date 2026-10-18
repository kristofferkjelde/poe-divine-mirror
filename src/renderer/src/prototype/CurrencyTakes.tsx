import { useState, type ReactNode } from 'react'
import { choices, formatAmount, LEAGUE, rate, TARGETS, type Held, type Target } from './fixtures'

const EMBERS = 9

function Frame({ children }: { children: ReactNode }) {
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
          {LEAGUE}
        </span>
        <button type="button" className="panel-link">
          Open currency exchange ↗
        </button>
      </footer>
    </div>
  )
}

function Slot({ item }: { item: Held }) {
  return (
    <figure className="ember-slot">
      <figcaption>Your currency</figcaption>
      <span className="cw-stack-art">
        <img className="item-art" src={item.art} alt="" draggable={false} />
        <b>{item.stack}</b>
      </span>
      <strong data-rarity="currency" className="cw-currency-name">
        {item.name}
      </strong>
      <small>
        Stack {item.stack} / {item.maxStack}
      </small>
    </figure>
  )
}

export function Amount({ value, target, big = false }: { value: number; target: Target; big?: boolean }) {
  return (
    <span className="ember-amount" data-big={big}>
      <img src={TARGETS[target].art} alt="" draggable={false} />
      <span>{formatAmount(value)}</span>
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

function Embers() {
  return (
    <span className="ember-embers" aria-hidden>
      {Array.from({ length: EMBERS }, (_, index) => (
        <i key={index} style={{ left: `${8 + index * 10}%`, animationDelay: `${(index * 0.37) % 2.4}s` }} />
      ))}
    </span>
  )
}

function Worth({ item, target }: { item: Held; target: Target }) {
  const value = rate(item, target)
  return (
    <>
      <small>Worth each</small>
      <strong className="ember-value">
        <Amount value={value.value} target={target} big />
      </strong>
      <Embers />
      <span className="ember-range">
        <Amount value={value.low} target={target} /> – <Amount value={value.high} target={target} />
      </span>
      <Pips on={value.reliability} />
      <span className="ember-range">{value.offers} offers</span>
    </>
  )
}

function Ledger({ item, target }: { item: Held; target: Target }) {
  const value = rate(item, target).value
  const per = TARGETS[target]
  return (
    <dl className="cw-ledger">
      <div>
        <dt>Your stack of {item.stack}</dt>
        <dd>
          <Amount value={value * item.stack} target={target} />
        </dd>
      </div>
      <div>
        <dt>Full stack of {item.maxStack}</dt>
        <dd>
          <Amount value={value * item.maxStack} target={target} />
        </dd>
      </div>
      <div>
        <dt>1 {per.name} buys</dt>
        <dd>
          <span className="ember-amount">
            <img src={item.art} alt="" draggable={false} />
            <span>{formatAmount(1 / value)}</span>
          </span>
        </dd>
      </div>
    </dl>
  )
}

export const nameA = 'Currency tabs'

export function VariantA({ item }: { item: Held }) {
  const options = choices(item)
  const [target, setTarget] = useState<Target>(options[0])
  return (
    <Frame>
      <div className="ember-top">
        <Slot item={item} />
        <div className="ember-estimate">
          <Worth item={item} target={target} />
        </div>
      </div>
      <div className="cw-picker">
        <span className="cw-label">Show in</span>
        <div className="ember-presets cw-tabs-row" role="group" aria-label="Show worth in">
          {options.map((option) => (
            <button key={option} type="button" aria-pressed={option === target} onClick={() => setTarget(option)}>
              <img src={TARGETS[option].art} alt="" draggable={false} />
              {TARGETS[option].short}
            </button>
          ))}
        </div>
      </div>
      <div className="ember-rule" aria-hidden>
        <span />
      </div>
      <Ledger item={item} target={target} />
    </Frame>
  )
}

export const nameB = 'Click the price'

export function VariantB({ item }: { item: Held }) {
  const options = choices(item)
  const [index, setIndex] = useState(0)
  const target = options[index]
  const step = (by: number) => setIndex((index + by + options.length) % options.length)
  return (
    <Frame>
      <div className="ember-top">
        <Slot item={item} />
        <button
          type="button"
          className="ember-estimate cw-cycle"
          title="Click for the next currency, right-click for the previous one"
          onClick={() => step(1)}
          onContextMenu={(event) => {
            event.preventDefault()
            step(-1)
          }}
        >
          <Worth key={target} item={item} target={target} />
          <span className="cw-cycle-dots" aria-hidden>
            {options.map((option) => (
              <img key={option} src={TARGETS[option].art} alt="" data-on={option === target} draggable={false} />
            ))}
          </span>
          <span className="cw-cycle-arrow" data-side="left" aria-hidden>
            ‹
          </span>
          <span className="cw-cycle-arrow" data-side="right" aria-hidden>
            ›
          </span>
        </button>
      </div>
      <p className="cw-hint">Click the price to switch currency · right-click goes back</p>
      <Ledger item={item} target={target} />
    </Frame>
  )
}

export const nameC = 'Exchange ledger'

export function VariantC({ item }: { item: Held }) {
  const options = choices(item)
  const [target, setTarget] = useState<Target>(options[0])
  return (
    <Frame>
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
            <th>Your {item.stack}</th>
            <th aria-label="Shown on top" />
          </tr>
        </thead>
        <tbody>
          {options.map((option) => {
            const value = rate(item, option).value
            return (
              <tr key={option} data-on={option === target} onClick={() => setTarget(option)} title="Show this one on top">
                <th>
                  <img src={TARGETS[option].art} alt="" draggable={false} />
                  {TARGETS[option].name}
                </th>
                <td>{formatAmount(value)}</td>
                <td>{formatAmount(value * item.stack)}</td>
                <td className="cw-star">{option === target ? '★' : '☆'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="cw-hint">Click a row to show it on top. Your pick is remembered.</p>
    </Frame>
  )
}
