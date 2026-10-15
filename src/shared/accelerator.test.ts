import { describe, expect, it } from 'vitest'
import { toAccelerator, type KeyLike } from './accelerator'

const press = (code: string, modifiers: Partial<KeyLike> = {}): KeyLike => ({
  key: code,
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...modifiers,
})

describe('toAccelerator', () => {
  it('builds Electron accelerators in a stable modifier order', () => {
    expect(toAccelerator(press('KeyD', { altKey: true }))).toEqual({ status: 'ok', accelerator: 'Alt+D' })
    expect(toAccelerator(press('KeyD', { shiftKey: true, altKey: true }))).toEqual({
      status: 'ok',
      accelerator: 'Alt+Shift+D',
    })
    expect(toAccelerator(press('Digit3', { ctrlKey: true }))).toEqual({ status: 'ok', accelerator: 'Ctrl+3' })
    expect(toAccelerator(press('Backquote', { ctrlKey: true, altKey: true }))).toEqual({
      status: 'ok',
      accelerator: 'Ctrl+Alt+`',
    })
  })

  it('waits while only modifiers are held', () => {
    expect(toAccelerator(press('AltLeft', { altKey: true }))).toEqual({ status: 'pending' })
    expect(toAccelerator(press('ShiftRight', { shiftKey: true }))).toEqual({ status: 'pending' })
  })

  it('allows bare function keys but not bare letters', () => {
    expect(toAccelerator(press('F7'))).toEqual({ status: 'ok', accelerator: 'F7' })
    expect(toAccelerator(press('KeyD')).status).toBe('invalid')
    expect(toAccelerator(press('KeyD', { shiftKey: true })).status).toBe('invalid')
  })

  it('rejects keys Electron cannot register', () => {
    expect(toAccelerator(press('IntlBackslash', { altKey: true })).status).toBe('invalid')
  })
})
