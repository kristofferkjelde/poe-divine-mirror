import { describe, expect, it } from 'vitest'
import { exchangeQuery, exchangeRate, exchangeUrl, formatAmount, stackSize, targetFor, targetsFor } from './exchange'

const offer = (exchange: number, item: number, stock = 100, have = 'chaos', want = 'divine') => ({
  listing: {
    offers: [
      { exchange: { currency: have, amount: exchange }, item: { currency: want, amount: item, stock } },
    ],
  },
})

const response = (...results: unknown[]) => ({
  id: 'abc',
  total: results.length,
  result: Object.fromEntries(results.map((result, index) => [`r${index}`, result])),
})

describe('currency exchange', () => {
  it('asks for the hovered currency, paid in the chosen one', () => {
    expect(exchangeQuery('divine', 'chaos')).toEqual({
      engine: 'new',
      query: { status: { option: 'online' }, have: ['chaos'], want: ['divine'] },
      sort: { have: 'asc' },
    })
    expect(exchangeUrl('Rise of the Abyssal', 'abc')).toBe(
      'https://www.pathofexile.com/trade2/exchange/poe2/Rise%20of%20the%20Abyssal/abc',
    )
    expect(exchangeUrl('Standard')).toBe('https://www.pathofexile.com/trade2/exchange/poe2/Standard')
  })

  it('takes the middle of the cheapest offers, per one of the hovered currency', () => {
    const rate = exchangeRate(
      response(offer(84, 1), offer(170, 2), offer(430, 5), offer(90, 1), offer(800, 10)),
      'divine',
      'chaos',
    )
    expect(rate).toEqual({ value: 85, low: 80, high: 90, offers: 5, reliability: 'Low' })
  })

  it('skips offers in another currency, without enough stock, or with broken amounts', () => {
    const rate = exchangeRate(
      response(offer(1, 1, 100, 'exalted'), offer(50, 1, 0), offer(0, 1), offer(86, 1), { listing: null }, null),
      'divine',
      'chaos',
    )
    expect(rate).toMatchObject({ value: 86, offers: 6, reliability: 'Very low' })
    expect(exchangeRate(response(), 'divine', 'chaos')).toBeNull()
    expect(exchangeRate({ error: { message: 'nope' } }, 'divine', 'chaos')).toBeNull()
  })

  it('never compares a currency with itself', () => {
    expect(targetsFor('Divine Orb')).toEqual(['chaos', 'exalted'])
    expect(targetsFor('Regal Orb')).toEqual(['chaos', 'exalted', 'divine'])
    expect(targetFor('Chaos Orb', 'chaos')).toBe('exalted')
    expect(targetFor('Chaos Orb', 'divine')).toBe('divine')
  })

  it('reads the stack size from the copied item', () => {
    expect(stackSize('Item Class: Stackable Currency\nRarity: Currency\nDivine Orb\n--------\nStack Size: 7/20\n')).toEqual({
      count: 7,
      max: 20,
    })
    expect(stackSize('Stack Size: 1,234/5,000')).toEqual({ count: 1234, max: 5000 })
    expect(stackSize('Rarity: Currency\nDivine Orb')).toBeUndefined()
  })

  it('formats small and large amounts readably', () => {
    expect(formatAmount(1716.4)).toBe('1,716')
    expect(formatAmount(85.84)).toBe('85.8')
    expect(formatAmount(4.817)).toBe('4.82')
    expect(formatAmount(0.011653)).toBe('0.012')
  })
})
