import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const disk = vi.hoisted(() => ({ files: new Map<string, unknown>() }))

vi.mock('./jsonFile', () => ({
  jsonFile: (name: string) => ({
    readAsync: async () => disk.files.get(name),
    write: async (data: unknown) => void disk.files.set(name, data),
  }),
}))

const { cache } = await import('./cache')

const HOUR = 60 * 60 * 1000

describe('cache', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: Date.parse('2026-10-18T20:00:00Z') })
    disk.files.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('ages a saved value from when it was fetched, not from when the app read it', async () => {
    disk.files.set('data.json', { poe2: { value: 'old', fetchedAt: Date.now() - 23 * HOUR } })
    const data = cache<string>({ file: 'data.json' })
    const load = vi.fn(async () => 'new')
    expect((await data.get('poe2', 24 * HOUR, load)).value).toBe('old')
    vi.advanceTimersByTime(2 * HOUR)
    expect((await data.get('poe2', 24 * HOUR, load)).value).toBe('new')
    expect(load).toHaveBeenCalledTimes(1)
    expect(disk.files.get('data.json')).toEqual({ poe2: { value: 'new', fetchedAt: Date.now() } })
  })

  it('loads a key once while it is already loading', async () => {
    const data = cache<number>()
    const load = vi.fn(async () => 7)
    const [a, b] = await Promise.all([data.get('k', HOUR, load), data.get('k', HOUR, load)])
    expect(a).toBe(b)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('keeps the last good value when a reload fails, unless told not to', async () => {
    const stale = cache<string>()
    await stale.get('k', HOUR, async () => 'good')
    vi.advanceTimersByTime(2 * HOUR)
    expect((await stale.get('k', HOUR, () => Promise.reject(new Error('down')))).value).toBe('good')

    const strict = cache<string>({ staleOnError: false })
    await strict.get('k', HOUR, async () => 'good')
    vi.advanceTimersByTime(2 * HOUR)
    await expect(strict.get('k', HOUR, () => Promise.reject(new Error('down')))).rejects.toThrow('down')
  })

  it('keeps only the newest keys and skips saved data in an old shape', async () => {
    disk.files.set('prices.json', { old: { fetchedAt: Date.now(), overview: {} } })
    const data = cache<number>({ file: 'prices.json', keep: 2 })
    for (const key of ['a', 'b', 'c']) {
      await data.get(key, HOUR, async () => key.charCodeAt(0))
      vi.advanceTimersByTime(1000)
    }
    expect(Object.keys(disk.files.get('prices.json') as object)).toEqual(['b', 'c'])
  })
})
