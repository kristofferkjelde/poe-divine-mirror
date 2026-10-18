import { describe, expect, it } from 'vitest'
import { inExalted, marketPrice, marketRate, parseOverview } from './market'
import { parseScoutPage, scoutCategory, scoutCurrenciesUrl, scoutOverview } from './scout'

const page = {
  CurrentPage: 1,
  Pages: 13,
  Total: 38,
  Items: [
    { ApiId: 'mirror', Text: 'Mirror of Kalandra', CurrentPrice: 4023054.8, CurrentQuantity: 24 },
    { ApiId: 'hinekoras-lock', Text: "Hinekora's Lock", CurrentPrice: '1266867', CurrentQuantity: 24 },
    { ApiId: 'divine', Text: 'Divine Orb', CurrentPrice: 756.7526506478251, CurrentQuantity: 85644 },
    { ApiId: 'chaos', Text: 'Chaos Orb', CurrentPrice: 74.47879942829918 },
    { ApiId: 'exalted', Text: 'Exalted Orb', CurrentPrice: null },
    { ApiId: 'unpriced', Text: 'Unpriced', CurrentPrice: null },
  ],
}

describe('poe2scout prices', () => {
  it('asks for a whole currency category of the league', () => {
    expect(scoutCategory('SoulCores')).toBe('ultimatum')
    expect(scoutCategory('Maps')).toBeUndefined()
    expect(scoutCurrenciesUrl('Forbidden Rites', 'currency', 2)).toBe(
      'https://api.poe2scout.com/poe2/Leagues/Forbidden%20Rites/Currencies/ByCategory?category=currency&page=2&perPage=250&dataPoints=7',
    )
  })

  it('reads prices in Exalted Orbs with how much has traded', () => {
    const parsed = parseScoutPage(page)
    expect(parsed?.pages).toBe(13)
    const overview = scoutOverview(parsed!.items)
    expect(overview.prices.exalted).toEqual({ value: 1 })
    expect(overview.prices.unpriced).toBeUndefined()
    expect(marketPrice(overview, { id: 'hinekoras-lock' })).toEqual({ value: 1266867, traded: 24 })
    expect(marketPrice(overview, { id: 'lock', text: "Hinekora's Lock" })?.value).toBe(1266867)
    const rate = marketRate(overview.prices['hinekoras-lock'], overview.prices.divine)
    expect(rate.value).toBeCloseTo(1674.1, 1)
    expect(marketRate(overview.prices.divine, overview.prices.chaos).value).toBeCloseTo(10.16, 2)
    expect(parseScoutPage({ error: 'nope' })).toBeNull()
  })

  it('puts poe.ninja prices in Exalted Orbs too, so both sources can be mixed', () => {
    const ninja = parseOverview({ core: { primary: 'divine', rates: { exalted: 750, chaos: 10 } }, lines: [] })!
    const exalted = inExalted(ninja)
    expect(exalted.prices.divine.value).toBeCloseTo(750)
    expect(exalted.prices.chaos.value).toBeCloseTo(75)
    expect(exalted.prices.exalted.value).toBeCloseTo(1)
  })
})
