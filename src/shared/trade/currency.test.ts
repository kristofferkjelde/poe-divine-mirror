import { describe, expect, it } from 'vitest'
import { currencyEntries, currencyIcons, currencyId, iconsFor } from './currency'

describe('currency icons', () => {
  it('reads the currency images from the trade static data', () => {
    const body = {
      result: [
        {
          id: 'Currency',
          entries: [
            { id: 'exalted', text: 'Exalted Orb', image: '/gen/image/abc/CurrencyAddModToRare.png' },
            { id: 'divine', text: 'Divine Orb', image: 'https://web.poecdn.com/gen/image/def/CurrencyModValues.png' },
            { id: 'sep', text: 'no image' },
          ],
        },
        { id: 'Fragments', entries: [{ id: 'exalted', image: '/other.png' }, { id: 'odd', image: 'javascript:alert(1)' }] },
      ],
    }
    expect(currencyIcons(body)).toEqual({
      exalted: 'https://web.poecdn.com/gen/image/abc/CurrencyAddModToRare.png',
      divine: 'https://web.poecdn.com/gen/image/def/CurrencyModValues.png',
    })
    expect(currencyIcons(null)).toEqual({})
  })

  it('keeps only the icons a result needs', () => {
    expect(iconsFor({ exalted: 'a', divine: 'b', chaos: 'c' }, ['exalted', 'regal', 'exalted'])).toEqual({ exalted: 'a' })
  })

  it('finds the exchange id of a currency by its name', () => {
    const entries = currencyEntries({
      result: [
        { id: 'Currency', entries: [{ id: 'divine', text: 'Divine Orb' }, { id: 'chaos', text: 'Chaos Orb', image: '/c.png' }] },
        { id: 'Runes', entries: [{ id: 'iron-rune', text: 'Iron Rune' }, { text: 'No id' }] },
      ],
    })
    expect(entries).toEqual([
      { id: 'divine', text: 'Divine Orb' },
      { id: 'chaos', text: 'Chaos Orb', image: 'https://web.poecdn.com/c.png' },
      { id: 'iron-rune', text: 'Iron Rune' },
    ])
    expect(currencyId(entries, 'Iron Rune')).toBe('iron-rune')
    expect(currencyId(entries, 'Mirror of Kalandra')).toBeUndefined()
  })
})
