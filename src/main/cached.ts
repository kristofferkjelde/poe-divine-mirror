import { jsonFile } from './jsonFile'

export function expiring<T>(load: () => Promise<T>, maxAgeMs: number): () => Promise<T> {
  let entry: { at: number; value: Promise<T> } | null = null
  return () => {
    if (!entry || Date.now() - entry.at > maxAgeMs) {
      const value = load()
      const current = { at: Date.now(), value }
      entry = current
      value.catch(() => {
        if (entry === current) entry = null
      })
    }
    return entry.value
  }
}

export function diskBacked<T>(name: string, maxAgeMs: number, fetch: () => Promise<T>, invalid: (value: T) => Error | null) {
  const file = jsonFile(name, { compact: true })
  return async (): Promise<T> => {
    const saved = (await file.readAsync()) as { fetchedAt?: number; result?: T } | undefined
    if (saved?.result && saved.fetchedAt && Date.now() - saved.fetchedAt < maxAgeMs) return saved.result
    try {
      const result = await fetch()
      const error = invalid(result)
      if (error) throw error
      await file.write({ fetchedAt: Date.now(), result })
      return result
    } catch (error) {
      if (saved?.result) return saved.result
      throw error
    }
  }
}
