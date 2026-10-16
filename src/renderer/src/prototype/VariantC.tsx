import { formatPrice } from '../../../shared/trade/price'
import { LedgerTabs } from './LedgerTabs'
import { RELIABILITY_PIPS } from './shared'
import type { VariantProps } from './types'

export const name = 'Arcane sapphire'

const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function VariantC(props: VariantProps) {
  return (
    <LedgerTabs
      {...props}
      theme="arcane"
      renderEstimate={(value, listed) => {
        const share = RELIABILITY_PIPS[value.reliability] / 4
        return (
          <>
            <svg className="lt-rune" viewBox="0 0 120 120" role="img" aria-label={`About ${formatPrice(value.value)}, reliability ${value.reliability}`}>
              {Array.from({ length: 36 }, (_, index) => (
                <line
                  key={index}
                  x1="60"
                  y1="4"
                  x2="60"
                  y2={index % 3 === 0 ? 11 : 8}
                  className="lt-rune-tick"
                  transform={`rotate(${index * 10} 60 60)`}
                />
              ))}
              <circle cx="60" cy="60" r={RADIUS} className="lt-rune-track" />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                className="lt-rune-arc"
                strokeDasharray={`${share * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                transform="rotate(-90 60 60)"
              />
              <circle cx="60" cy="60" r="36" className="lt-rune-inner" />
              <text x="60" y="60" className="lt-rune-value">
                {formatPrice(value.value).split(' ')[0]}
              </text>
              <text x="60" y="78" className="lt-rune-unit">
                {formatPrice(value.value).split(' ').slice(1).join(' ')}
              </text>
            </svg>
            <span className="lt-range">
              {formatPrice(value.low)} – {formatPrice(value.high)}
            </span>
            <small>
              Reliability {value.reliability} · {listed}
            </small>
          </>
        )
      }}
    />
  )
}
