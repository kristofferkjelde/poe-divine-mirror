import { ART_ORIGIN } from './item/artOrigin'
import { IMAGE_ORIGIN } from './trade/currency'

export const IMAGE_SCHEME = 'divine-art'

const SOURCES = {
  repoe: { base: ART_ORIGIN, type: 'image/webp' },
  poecdn: { base: `${IMAGE_ORIGIN}/`, type: 'image/png' },
} as const

type Source = keyof typeof SOURCES

const isSource = (value: string): value is Source => Object.hasOwn(SOURCES, value)

export function cachedImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  const entry = Object.entries(SOURCES).find(([, { base }]) => url.startsWith(base))
  return entry ? `${IMAGE_SCHEME}://${entry[0]}/${encodeURIComponent(url.slice(entry[1].base.length))}` : undefined
}

export function remoteImage(cached: string): { url: string; type: string } | undefined {
  try {
    const { protocol, hostname, pathname } = new URL(cached)
    if (protocol !== `${IMAGE_SCHEME}:` || !isSource(hostname)) return undefined
    const { base, type } = SOURCES[hostname]
    const url = new URL(decodeURIComponent(pathname.slice(1)), base).href
    return url.startsWith(base) && url.length > base.length ? { url, type } : undefined
  } catch {
    return undefined
  }
}
