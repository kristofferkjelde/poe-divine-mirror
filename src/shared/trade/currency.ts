import { UserFacingError } from '../errors'

export const IMAGE_ORIGIN = 'https://web.poecdn.com'

export type CurrencyIcons = Record<string, string>

export interface CurrencyEntry {
  id: string
  text?: string
  image?: string
}

export interface ExchangeGroup {
  id: string
  label: string
  entries: CurrencyEntry[]
}

interface StaticEntry {
  id?: unknown
  text?: unknown
  image?: unknown
}

interface StaticGroup {
  id?: unknown
  label?: unknown
  entries?: StaticEntry[]
}

export function exchangeGroups(body: unknown): ExchangeGroup[] {
  const groups = (body as { result?: StaticGroup[] } | null)?.result
  const parsed = (Array.isArray(groups) ? groups : []).flatMap((group) => {
    if (typeof group?.id !== 'string' || !Array.isArray(group.entries)) return []
    const entries = group.entries.flatMap(({ id, text, image }) => {
      if (typeof id !== 'string') return []
      const url = typeof image === 'string' ? toImageUrl(image) : undefined
      return [{ id, ...(typeof text === 'string' && { text }), ...(url && { image: url }) }]
    })
    return [{ id: group.id, label: typeof group.label === 'string' && group.label ? group.label : group.id, entries }]
  })
  if (parsed.length === 0) throw new UserFacingError('The trade site sent unexpected currency data')
  return parsed
}

export function iconsOf(entries: CurrencyEntry[]): CurrencyIcons {
  const icons: CurrencyIcons = {}
  for (const { id, image } of entries) if (image && !(id in icons)) icons[id] = image
  return icons
}

export interface FoundEntry {
  group: ExchangeGroup
  entry: CurrencyEntry
}

export function findEntry(groups: ExchangeGroup[], match: (entry: CurrencyEntry) => boolean): FoundEntry | undefined {
  for (const group of groups) {
    const entry = group.entries.find(match)
    if (entry) return { group, entry }
  }
  return undefined
}

export function findByName(groups: ExchangeGroup[], names: string[]): FoundEntry | undefined {
  for (const name of names.map((value) => value.toLowerCase())) {
    const found = findEntry(groups, ({ text }) => text?.toLowerCase() === name)
    if (found) return found
  }
  return undefined
}

function toImageUrl(image: string): string | undefined {
  try {
    const url = new URL(image, IMAGE_ORIGIN)
    return url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

export const iconsFor = (icons: CurrencyIcons, currencies: string[]): CurrencyIcons =>
  Object.fromEntries(currencies.filter((currency) => icons[currency]).map((currency) => [currency, icons[currency]]))
