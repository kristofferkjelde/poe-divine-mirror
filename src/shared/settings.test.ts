import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings } from './settings'

describe('settings', () => {
  it('moves hotkeys saved with the old D defaults to the Z defaults', () => {
    const settings = normalizeSettings({ hotkeys: { compare: 'Alt+D', equip: 'Alt+Shift+D', price: 'Ctrl+D' } })
    expect(settings.hotkeys).toEqual(DEFAULT_SETTINGS.hotkeys)
  })

  it('keeps hotkeys the player chose', () => {
    const settings = normalizeSettings({ hotkeys: { compare: 'F2', equip: 'Alt+Shift+D', price: 'Ctrl+Shift+P' } })
    expect(settings.hotkeys).toEqual({ compare: 'F2', equip: 'Alt+Shift+Z', price: 'Ctrl+Shift+P' })
  })

  it('keeps the currency worth is shown in, defaulting to Chaos', () => {
    expect(normalizeSettings({ currencyTarget: 'divine' }).currencyTarget).toBe('divine')
    expect(normalizeSettings({ currencyTarget: 'iron-rune' }).currencyTarget).toBe('iron-rune')
    expect(normalizeSettings({ currencyTarget: 'Not an id!' }).currencyTarget).toBe('chaos')
    expect(normalizeSettings(null).currencyTarget).toBe('chaos')
    expect(normalizeSettings({ currencyFlipped: true }).currencyFlipped).toBe(true)
    expect(normalizeSettings({ currencyFlipped: 'yes' }).currencyFlipped).toBe(false)
  })
})
