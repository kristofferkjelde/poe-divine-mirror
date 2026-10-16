import { formatPrice } from '../../../shared/trade/price'
import { LedgerTabs } from './LedgerTabs'
import { Pips } from './shared'
import type { VariantProps } from './types'

export const name = 'Ember obsidian'

export function VariantB(props: VariantProps) {
  return (
    <LedgerTabs
      {...props}
      theme="ember"
      renderEstimate={(value, listed) => (
        <>
          <small>Worth about</small>
          <strong className="lt-ember-value">{formatPrice(value.value)}</strong>
          <span className="lt-embers" aria-hidden>
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} style={{ left: `${8 + index * 10}%`, animationDelay: `${(index * 0.37) % 2.4}s` }} />
            ))}
          </span>
          <span className="lt-range">
            {formatPrice(value.low)} – {formatPrice(value.high)}
          </span>
          <Pips reliability={value.reliability} />
          <small>{listed}</small>
        </>
      )}
    />
  )
}
