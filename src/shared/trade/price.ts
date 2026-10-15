export interface Listing {
  amount: number
  currency: string
  indexed?: string
}

export type PriceCheckResult =
  | {
      ok: true
      league: string
      url: string
      total: number
      listings: Listing[]
      matched: string[]
      unmatched: string[]
      relaxed: boolean
    }
  | { ok: false; error: string; url?: string }

export const TRADE_ORIGIN = 'https://www.pathofexile.com'

export const tradeUrl = (league: string, searchId: string) =>
  `${TRADE_ORIGIN}/trade2/search/poe2/${encodeURIComponent(league)}/${encodeURIComponent(searchId)}`

const CURRENCY_LABELS: Record<string, string> = {
  exalted: 'ex',
  divine: 'div',
  chaos: 'chaos',
  mirror: 'mirror',
  alch: 'alch',
  regal: 'regal',
  aug: 'aug',
  transmute: 'transmute',
  annul: 'annul',
  vaal: 'vaal',
  chance: 'chance',
}

export function formatPrice({ amount, currency }: Listing): string {
  return `${Number(amount.toFixed(2))} ${CURRENCY_LABELS[currency] ?? currency}`
}

export function typicalListing(listings: Listing[]): Listing | undefined {
  return listings[Math.floor((listings.length - 1) / 2)]
}

export function formatAge(indexed: string | undefined, now: number): string | undefined {
  const time = indexed ? Date.parse(indexed) : Number.NaN
  if (!Number.isFinite(time)) return undefined
  const minutes = Math.max(0, Math.round((now - time) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

interface FetchedResult {
  listing?: { indexed?: string; price?: { amount?: unknown; currency?: unknown } | null }
}

export function parseListings(body: unknown): Listing[] {
  const results = (body as { result?: Array<FetchedResult | null> } | null)?.result ?? []
  return results.flatMap((result) => {
    const price = result?.listing?.price
    if (!price || typeof price.amount !== 'number' || typeof price.currency !== 'string') return []
    return [{ amount: price.amount, currency: price.currency, indexed: result?.listing?.indexed }]
  })
}

export function pickLeague(leagues: string[]): string {
  return leagues.find((id) => !/standard|hardcore|^hc\b|ssf/i.test(id)) ?? leagues[0] ?? 'Standard'
}

export function leagueIds(body: unknown): string[] {
  return ((body as { result?: Array<{ id?: unknown; realm?: unknown }> } | null)?.result ?? [])
    .filter((league) => typeof league.id === 'string' && (league.realm === undefined || league.realm === 'poe2'))
    .map((league) => league.id as string)
}

export function rateLimitWait(limits: string | null, state: string | null): number {
  if (!limits || !state) return 0
  const rules = limits.split(',').map((rule) => rule.split(':').map(Number))
  const current = state.split(',').map((rule) => rule.split(':').map(Number))
  let wait = 0
  rules.forEach(([max, period, penalty], index) => {
    const [hits, , restricted] = current[index] ?? []
    if (restricted > 0) wait = Math.max(wait, restricted)
    else if (hits >= max) wait = Math.max(wait, period || penalty || 0)
  })
  return wait * 1000
}
