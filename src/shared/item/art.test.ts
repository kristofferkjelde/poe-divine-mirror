import { describe, expect, it } from 'vitest'
import { ART_ORIGIN, currencyArt, itemArt } from './art'

describe('itemArt', () => {
  it('finds the artwork for uniques by name and everything else by base type', () => {
    expect(itemArt({ rarity: 'Unique', name: 'Astramentis', baseType: 'Stellar Amulet' })).toBe(
      `${ART_ORIGIN}Amulets/Uniques/Astramentis.webp`,
    )
    expect(itemArt({ rarity: 'Rare', name: 'Damnation Urge', baseType: 'Wanderer Shoes' })).toBe(
      `${ART_ORIGIN}Armours/Boots/Basetypes/BootsDexInt01.webp`,
    )
  })

  it('finds the base type inside a magic item name', () => {
    expect(itemArt({ rarity: 'Magic', name: "Dancer's Iron Ring of the Flatworm", baseType: '' })).toBe(
      `${ART_ORIGIN}Rings/Basetypes/IronRing.webp`,
    )
  })

  it('has nothing for items it does not know', () => {
    expect(itemArt({ rarity: 'Rare', name: 'Nope', baseType: 'Imaginary Boots' })).toBeUndefined()
  })
})

describe('currencyArt', () => {
  it('finds the orb for each trade currency id', () => {
    expect(currencyArt('exalted')).toBe(`${ART_ORIGIN}Currency/CurrencyAddModToRare.webp`)
    expect(currencyArt('divine')).toBe(`${ART_ORIGIN}Currency/CurrencyModValues.webp`)
    expect(currencyArt('toString')).toBeUndefined()
  })
})
