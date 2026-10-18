import { describe, expect, it } from 'vitest'
import { exchangeNames, exchangeUrl, formatAmount, stackSize, targetFor } from './exchange'

describe('currency exchange', () => {
  it('links the league on the trade site exchange', () => {
    expect(exchangeUrl('Rise of the Abyssal')).toBe(
      'https://www.pathofexile.com/trade2/exchange/poe2/Rise%20of%20the%20Abyssal',
    )
  })

  it('never compares a currency with itself', () => {
    expect(targetFor('divine', 'chaos')).toBe('chaos')
    expect(targetFor('chaos', 'chaos')).toBe('divine')
    expect(targetFor('exalted', 'exalted')).toBe('chaos')
    expect(targetFor('iron-rune', 'exalted')).toBe('exalted')
  })

  it('names gems by level and waystones by tier, then by name and base', () => {
    const property = (name: string, value: string) => ({
      name,
      value,
      augmented: false,
    })
    expect(
      exchangeNames({
        name: 'Uncut Skill Gem',
        baseType: 'Uncut Skill Gem',
        properties: [property('Level', '19')],
      }),
    ).toEqual(['Uncut Skill Gem (Level 19)', 'Uncut Skill Gem'])
    expect(
      exchangeNames({
        name: 'Waystone',
        baseType: 'Waystone',
        properties: [property('Waystone Tier', '15')],
      }),
    ).toEqual(['Waystone (Tier 15)', 'Waystone'])
    expect(
      exchangeNames({
        name: 'Divine Orb',
        baseType: undefined,
        properties: [],
      }),
    ).toEqual(['Divine Orb'])
  })

  it('reads the stack size from the copied item', () => {
    expect(
      stackSize('Item Class: Stackable Currency\nRarity: Currency\nDivine Orb\n--------\nStack Size: 7/20\n'),
    ).toEqual({
      count: 7,
      max: 20,
    })
    expect(stackSize('Stack Size: 1,234/5,000')).toEqual({
      count: 1234,
      max: 5000,
    })
    expect(stackSize('Rarity: Currency\nDivine Orb')).toBeUndefined()
  })

  it('formats small and large amounts readably', () => {
    expect(formatAmount(1716.4)).toBe('1,716')
    expect(formatAmount(85.84)).toBe('85.8')
    expect(formatAmount(4.817)).toBe('4.82')
    expect(formatAmount(0.011653)).toBe('0.012')
  })
})
