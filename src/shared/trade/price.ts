import type { ParsedItem } from '../item/types'
import type { CurrencyIcons } from './currency'
import { toListedItem, type TradeItem } from './listedItem'
import type { ItemSearch } from './query'

export interface Price {
  amount: number
  currency: string
}

export interface Listing extends Price {
  indexed?: string
  account?: string
  itemLevel?: number
  quality?: number
  item?: ParsedItem
}

export type PriceCheckResult =
  | { ok: true; league: string; url: string; total: number; listings: Listing[]; icons: CurrencyIcons }
  | { ok: false; error: string; url?: string; retryAt?: number }

export type PrepareResult = { ok: true; id: string; search: ItemSearch } | { ok: false; error: string }

export type Reliability = 'Very low' | 'Low' | 'Medium' | 'High'

export interface Estimate {
  value: Price
  low: Price
  high: Price
  reliability: Reliability
}

export const TRADE_ORIGIN = 'https://www.pathofexile.com'

export const tradeUrl = (league: string, searchId: string) =>
  `${TRADE_ORIGIN}/trade2/search/poe2/${encodeURIComponent(league)}/${encodeURIComponent(searchId)}`

const CURRENCY_LABELS: Partial<Record<string, string>> = {
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

export function formatPrice({ amount, currency }: Price): string {
  return `${Number(amount.toFixed(2))} ${CURRENCY_LABELS[currency] ?? currency}`
}

export function estimate(listings: Listing[], total: number): Estimate | null {
  if (listings.length === 0) return null
  const sample = listings.slice(0, 10)
  const reliability: Reliability =
    sample.length < 3 ? 'Very low' : total < 10 ? 'Low' : total < 40 ? 'Medium' : 'High'
  return {
    value: sample[Math.floor((sample.length - 1) / 2)],
    low: sample[0],
    high: sample[sample.length - 1],
    reliability,
  }
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
  listing?: {
    indexed?: string
    account?: { name?: unknown }
    price?: { amount?: unknown; currency?: unknown } | null
  }
  item?: TradeItem
}

function qualityOf(item: FetchedResult['item']): number | undefined {
  const property = item?.properties?.find((entry) => typeof entry.name === 'string' && /Quality/.test(entry.name))
  const raw = Array.isArray(property?.values) ? (property.values as unknown[][])[0]?.[0] : undefined
  const match = typeof raw === 'string' ? /\d+/.exec(raw) : null
  return match ? Number(match[0]) : undefined
}

export function parseListings(body: unknown): Listing[] {
  const results = (body as { result?: Array<FetchedResult | null> } | null)?.result ?? []
  return results.flatMap((result) => {
    const price = result?.listing?.price
    if (!price || typeof price.amount !== 'number' || typeof price.currency !== 'string') return []
    const listing: Listing = { amount: price.amount, currency: price.currency, indexed: result?.listing?.indexed }
    const account = result?.listing?.account?.name
    if (typeof account === 'string') listing.account = account
    if (typeof result?.item?.ilvl === 'number') listing.itemLevel = result.item.ilvl
    const quality = qualityOf(result?.item)
    if (quality !== undefined) listing.quality = quality
    const item = toListedItem(result?.item)
    if (item) listing.item = item
    return [listing]
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
