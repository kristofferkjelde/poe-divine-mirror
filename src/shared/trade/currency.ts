export const IMAGE_ORIGIN = 'https://web.poecdn.com'

export type CurrencyIcons = Record<string, string>

export interface CurrencyEntry {
  id: string
  text?: string
  image?: string
}

interface StaticEntry {
  id?: unknown
  text?: unknown
  image?: unknown
}

export function currencyEntries(body: unknown): CurrencyEntry[] {
  const groups = (body as { result?: Array<{ entries?: StaticEntry[] }> } | null)?.result
  if (!Array.isArray(groups)) return []
  return groups
    .flatMap((group) => group.entries ?? [])
    .flatMap(({ id, text, image }) => {
      if (typeof id !== 'string') return []
      const url = typeof image === 'string' ? toImageUrl(image) : undefined
      return [{ id, ...(typeof text === 'string' && { text }), ...(url && { image: url }) }]
    })
}

export function iconsOf(entries: CurrencyEntry[]): CurrencyIcons {
  const icons: CurrencyIcons = {}
  for (const { id, image } of entries) if (image && !(id in icons)) icons[id] = image
  return icons
}

export const currencyIcons = (body: unknown): CurrencyIcons => iconsOf(currencyEntries(body))

export const currencyId = (entries: CurrencyEntry[], name: string): string | undefined =>
  entries.find((entry) => entry.text === name)?.id

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
