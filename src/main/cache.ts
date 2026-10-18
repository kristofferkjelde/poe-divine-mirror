import { jsonFile } from './jsonFile'

export interface Cached<T> {
  value: T
  fetchedAt: number
}

export interface Cache<T> {
  get(key: string, maxAgeMs: number, load: () => Promise<T>): Promise<Cached<T>>
}

interface CacheOptions {
  file?: string
  keep?: number
  staleOnError?: boolean
}

const isCached = (value: unknown): value is Cached<unknown> =>
  typeof value === 'object' && value !== null && 'value' in value && typeof (value as Cached<unknown>).fetchedAt === 'number'

export function cache<T>({ file, keep = Infinity, staleOnError = true }: CacheOptions = {}): Cache<T> {
  const disk = file === undefined ? undefined : jsonFile(file, { compact: true })
  const loading = new Map<string, Promise<Cached<T>>>()
  let entries: Promise<Map<string, Cached<T>>> | undefined

  const saved = () =>
    (entries ??= Promise.resolve(disk?.readAsync()).then(
      (data) =>
        new Map(
          Object.entries(typeof data === 'object' && data !== null ? data : {}).filter(
            (entry): entry is [string, Cached<T>] => isCached(entry[1]),
          ),
        ),
    ))

  const store = (all: Map<string, Cached<T>>, key: string, value: T): Cached<T> => {
    const entry = { value, fetchedAt: Date.now() }
    all.set(key, entry)
    for (const [old] of [...all].sort(([, a], [, b]) => b.fetchedAt - a.fetchedAt).slice(keep)) all.delete(old)
    disk?.write(Object.fromEntries(all)).catch((error: unknown) => console.warn(`Could not save ${file}`, error))
    return entry
  }

  return {
    async get(key, maxAgeMs, load) {
      const all = await saved()
      const known = all.get(key)
      if (known && Date.now() - known.fetchedAt < maxAgeMs) return known
      let pending = loading.get(key)
      if (!pending) {
        pending = load()
          .then((value) => store(all, key, value))
          .catch((error: unknown) => {
            if (known && staleOnError) return known
            throw error
          })
          .finally(() => loading.delete(key))
        loading.set(key, pending)
      }
      return pending
    },
  }
}
