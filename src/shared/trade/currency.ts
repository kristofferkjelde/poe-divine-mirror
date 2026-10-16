export const IMAGE_ORIGIN = 'https://web.poecdn.com'

export type CurrencyIcons = Record<string, string>

interface StaticEntry {
  id?: unknown
  image?: unknown
}

export function currencyIcons(body: unknown): CurrencyIcons {
  const groups = (body as { result?: Array<{ entries?: StaticEntry[] }> } | null)?.result
  if (!Array.isArray(groups)) return {}
  const icons: CurrencyIcons = {}
  for (const { id, image } of groups.flatMap((group) => group.entries ?? [])) {
    if (typeof id !== 'string' || typeof image !== 'string' || id in icons) continue
    const url = toImageUrl(image)
    if (url) icons[id] = url
  }
  return icons
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
