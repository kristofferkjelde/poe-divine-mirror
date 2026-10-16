import { formatPrice } from '../../../shared/trade/price'
import { LedgerTabs } from './LedgerTabs'
import { Pips } from './shared'
import type { VariantProps } from './types'

export const name = 'Gilded reliquary'

export function VariantA(props: VariantProps) {
  return (
    <LedgerTabs
      {...props}
      theme="reliquary"
      renderEstimate={(value, listed) => (
        <>
          <small>Worth about</small>
          <svg className="lt-coin" viewBox="0 0 120 120" role="img" aria-label={`About ${formatPrice(value.value)}`}>
            <defs>
              <radialGradient id="coin-face" cx="0.38" cy="0.32" r="0.75">
                <stop offset="0%" stopColor="#fff4c8" />
                <stop offset="45%" stopColor="#e2bd68" />
                <stop offset="100%" stopColor="#7a5520" />
              </radialGradient>
            </defs>
            <circle cx="60" cy="60" r="56" fill="#3b2a10" />
            <circle cx="60" cy="60" r="52" fill="url(#coin-face)" />
            <circle cx="60" cy="60" r="44" fill="none" stroke="#7a5520" strokeWidth="1.5" strokeDasharray="2 3" />
            <text x="60" y="58" className="lt-coin-value">
              {formatPrice(value.value).split(' ')[0]}
            </text>
            <text x="60" y="80" className="lt-coin-unit">
              {formatPrice(value.value).split(' ').slice(1).join(' ')}
            </text>
          </svg>
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
