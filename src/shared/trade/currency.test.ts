import { describe, expect, it } from 'vitest'
import { exchangeGroups, findByName, findEntry, iconsFor, iconsOf } from './currency'

describe('currency icons', () => {
  it('reads the currency images from the trade static data', () => {
    const body = {
      result: [
        {
          id: 'Currency',
          entries: [
            {
              id: 'exalted',
              text: 'Exalted Orb',
              image: '/gen/image/abc/CurrencyAddModToRare.png',
            },
            {
              id: 'divine',
              text: 'Divine Orb',
              image: 'https://web.poecdn.com/gen/image/def/CurrencyModValues.png',
            },
            { id: 'sep', text: 'no image' },
          ],
        },
        {
          id: 'Fragments',
          entries: [
            { id: 'exalted', image: '/other.png' },
            { id: 'odd', image: 'javascript:alert(1)' },
          ],
        },
      ],
    }
    expect(iconsOf(exchangeGroups(body).flatMap((group) => group.entries))).toEqual({
      exalted: 'https://web.poecdn.com/gen/image/abc/CurrencyAddModToRare.png',
      divine: 'https://web.poecdn.com/gen/image/def/CurrencyModValues.png',
    })
    expect(() => exchangeGroups(null)).toThrow('The trade site sent unexpected currency data')
    expect(() => exchangeGroups({ result: [{ label: 'No id' }] })).toThrow()
  })

  it('keeps only the icons a result needs', () => {
    expect(iconsFor({ exalted: 'a', divine: 'b', chaos: 'c' }, ['exalted', 'regal', 'exalted'])).toEqual({
      exalted: 'a',
    })
  })

  it('finds the exchange id of a currency by its name', () => {
    const groups = exchangeGroups({
      result: [
        {
          id: 'Currency',
          entries: [
            { id: 'divine', text: 'Divine Orb' },
            { id: 'chaos', text: 'Chaos Orb', image: '/c.png' },
          ],
        },
        {
          id: 'Runes',
          entries: [{ id: 'iron-rune', text: 'Iron Rune' }, { text: 'No id' }],
        },
      ],
    })
    expect(groups.flatMap((group) => group.entries)).toEqual([
      { id: 'divine', text: 'Divine Orb' },
      { id: 'chaos', text: 'Chaos Orb', image: 'https://web.poecdn.com/c.png' },
      { id: 'iron-rune', text: 'Iron Rune' },
    ])
  })

  it('finds an item in any exchange group by its name', () => {
    const groups = exchangeGroups({
      result: [
        {
          id: 'Currency',
          label: 'Currency',
          entries: [{ id: 'divine', text: 'Divine Orb' }],
        },
        {
          id: 'UncutGems',
          entries: [{ id: 'uncut-skill-gem-19', text: 'Uncut Skill Gem (Level 19)' }],
        },
        {
          id: 'Runes',
          label: 'Runes',
          entries: [{ id: 'iron-rune', text: 'Iron Rune' }],
        },
      ],
    })
    expect(groups.map(({ id, label }) => [id, label])).toEqual([
      ['Currency', 'Currency'],
      ['UncutGems', 'UncutGems'],
      ['Runes', 'Runes'],
    ])
    expect(findByName(groups, ['Uncut Skill Gem (Level 19)', 'Uncut Skill Gem'])).toEqual({
      group: groups[1],
      entry: { id: 'uncut-skill-gem-19', text: 'Uncut Skill Gem (Level 19)' },
    })
    expect(findByName(groups, ['iron rune'])?.entry.id).toBe('iron-rune')
    expect(findByName(groups, ['Mirror of Kalandra'])).toBeUndefined()
    expect(findEntry(groups, ({ id }) => id === 'divine')?.group.id).toBe('Currency')
  })
})
