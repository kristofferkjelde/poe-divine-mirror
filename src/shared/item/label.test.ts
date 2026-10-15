import { describe, expect, it } from 'vitest'
import { itemLabel } from './label'

describe('itemLabel', () => {
  it('shows the name with its base type', () => {
    expect(itemLabel({ name: 'Doom Coil', baseType: 'Iron Ring' })).toBe('Doom Coil, Iron Ring')
  })

  it('uses the base type when Path of Building left the default name', () => {
    expect(itemLabel({ name: 'New Item', baseType: 'Soaring Spear' })).toBe('Soaring Spear')
  })

  it('does not repeat the base of magic and normal items', () => {
    expect(itemLabel({ name: 'Life Flask of the Doctor', baseType: 'Ultimate Life Flask' })).toBe('Life Flask of the Doctor, Ultimate Life Flask')
    expect(itemLabel({ name: 'Iron Ring', baseType: 'Iron Ring' })).toBe('Iron Ring')
    expect(itemLabel({ name: 'Glinting Iron Ring of Haste', baseType: undefined })).toBe('Glinting Iron Ring of Haste')
  })
})
