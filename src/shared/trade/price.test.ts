import { describe, expect, it } from 'vitest'
import { formatAge, formatPrice, leagueIds, parseListings, pickLeague, rateLimitWait, tradeUrl, typicalListing } from './price'

describe('trade price helpers', () => {
  it('reads priced listings and skips unpriced ones', () => {
    const body = {
      result: [
        { listing: { indexed: '2026-10-15T10:00:00Z', price: { type: '~price', amount: 3, currency: 'exalted' } } },
        { listing: { indexed: '2026-10-15T10:00:00Z', price: null } },
        null,
        { listing: { price: { amount: 1, currency: 'divine' } } },
      ],
    }
    expect(parseListings(body)).toEqual([
      { amount: 3, currency: 'exalted', indexed: '2026-10-15T10:00:00Z' },
      { amount: 1, currency: 'divine', indexed: undefined },
    ])
  })

  it('formats prices, ages and the typical listing', () => {
    expect(formatPrice({ amount: 1.5, currency: 'divine' })).toBe('1.5 div')
    expect(formatPrice({ amount: 12, currency: 'exalted' })).toBe('12 ex')
    const now = Date.parse('2026-10-15T12:00:00Z')
    expect(formatAge('2026-10-15T11:30:00Z', now)).toBe('30m')
    expect(formatAge('2026-10-14T12:00:00Z', now)).toBe('24h')
    expect(formatAge(undefined, now)).toBeUndefined()
    const listings = [1, 2, 3, 4].map((amount) => ({ amount, currency: 'exalted' }))
    expect(typicalListing(listings)?.amount).toBe(2)
  })

  it('picks the current softcore trade league', () => {
    const ids = leagueIds({
      result: [
        { id: 'Rise of the Abyssal', realm: 'poe2' },
        { id: 'Hardcore Rise of the Abyssal', realm: 'poe2' },
        { id: 'Standard', realm: 'poe2' },
        { id: 'Mercenaries', realm: 'pc' },
      ],
    })
    expect(ids).toEqual(['Rise of the Abyssal', 'Hardcore Rise of the Abyssal', 'Standard'])
    expect(pickLeague(ids)).toBe('Rise of the Abyssal')
    expect(pickLeague(['Standard', 'Hardcore'])).toBe('Standard')
  })

  it('waits out a rate limit rule that is full or restricted', () => {
    expect(rateLimitWait('8:10:60,15:60:120', '3:10:0,4:60:0')).toBe(0)
    expect(rateLimitWait('8:10:60,15:60:120', '8:10:0,4:60:0')).toBe(10_000)
    expect(rateLimitWait('8:10:60', '9:10:45')).toBe(45_000)
    expect(rateLimitWait(null, null)).toBe(0)
  })

  it('links to the search on the trade site', () => {
    expect(tradeUrl('Rise of the Abyssal', 'Ab3x')).toBe('https://www.pathofexile.com/trade2/search/poe2/Rise%20of%20the%20Abyssal/Ab3x')
  })
})
