import { describe, expect, it } from 'vitest'
import { isMarketType, marketPrice, marketRate, ninjaUrl, parseOverview, relayUrl } from './market'

const overview = {
  core: {
    primary: 'divine',
    secondary: 'exalted',
    rates: { exalted: 702.5, chaos: 25 },
    items: [{ id: 'divine', name: 'Divine Orb' }],
  },
  lines: [
    { id: 'exalted', primaryValue: 1 / 702.5, volumePrimaryValue: 300 },
    { id: 'annul', primaryValue: 0.5, volumePrimaryValue: 1.5 },
    { id: 'broken', primaryValue: 0 },
    { id: 7, primaryValue: 1 },
  ],
  items: [
    { id: 'exalted', name: 'Exalted Orb' },
    { id: 'annul', name: 'Orb of Annulment' },
  ],
}

describe('currency market', () => {
  it('asks the relay first and poe.ninja as a fallback', () => {
    expect(relayUrl('Rise of the Abyssal', 'Currency')).toBe(
      'https://www.poe-divine-mirror.com/api/exchange?league=Rise+of+the+Abyssal&type=Currency',
    )
    expect(ninjaUrl('Standard', 'Runes')).toBe(
      'https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Standard&type=Runes',
    )
    expect(isMarketType('UncutGems')).toBe(true)
    expect(isMarketType('Maps')).toBe(false)
  })

  it('reads every price in the primary currency, with how many traded', () => {
    const parsed = parseOverview(overview)
    expect(parsed?.primary).toBe('divine')
    expect(parsed?.prices.divine).toEqual({ value: 1 })
    expect(parsed?.prices.chaos).toEqual({ value: 0.04 })
    expect(parsed?.prices.exalted.value).toBeCloseTo(1 / 702.5)
    expect(parsed?.prices.exalted.traded).toBeCloseTo(210_750)
    expect(parsed?.prices.annul).toEqual({ value: 0.5, traded: 3 })
    expect(parsed?.prices.broken).toBeUndefined()
    expect(parseOverview({ lines: [] })).toBeNull()
    expect(parseOverview(null)).toBeNull()
  })

  it('finds prices by id, then by name', () => {
    const parsed = parseOverview(overview)!
    expect(marketPrice(parsed, { id: 'annul' })).toEqual({
      value: 0.5,
      traded: 3,
    })
    expect(marketPrice(parsed, { id: 'orb-of-annulment', text: 'Orb of Annulment' })).toEqual({ value: 0.5, traded: 3 })
    expect(marketPrice(parsed, { id: 'mirror', text: 'Mirror of Kalandra' })).toBeUndefined()
  })

  it('converts between any two currencies through the primary one', () => {
    const parsed = parseOverview(overview)!
    const divineInExalted = marketRate(parsed.prices.divine, parsed.prices.exalted)
    expect(divineInExalted.value).toBeCloseTo(702.5)
    expect(divineInExalted.reliability).toBe('Medium')
    expect(marketRate(parsed.prices.annul, parsed.prices.chaos)).toEqual({
      value: 12.5,
      traded: 3,
      reliability: 'Very low',
    })
    expect(marketRate(parsed.prices.exalted, parsed.prices.divine).reliability).toBe('High')
  })
})
