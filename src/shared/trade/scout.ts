import type { MarketOverview, MarketPrice } from './market'

export const SCOUT_ORIGIN = 'https://poe2scout.com'
export const SCOUT_API = 'https://api.poe2scout.com'
export const SCOUT_PAGE = SCOUT_ORIGIN
export const SCOUT_PAGE_SIZE = 250
export const SCOUT_MAX_PAGES = 8

const CATEGORIES: Partial<Record<string, string>> = {
  Currency: 'currency',
  Fragments: 'fragments',
  Abyss: 'abyss',
  UncutGems: 'uncutgems',
  LineageSupportGems: 'lineagesupportgems',
  Essences: 'essences',
  SoulCores: 'ultimatum',
  Idols: 'idol',
  Runes: 'runes',
  Ritual: 'ritual',
  Expedition: 'expedition',
  Delirium: 'delirium',
  Breach: 'breach',
  Verisium: 'verisium',
}

export const scoutCategory = (type: string): string | undefined => CATEGORIES[type]

const leaguePath = (league: string) => `${SCOUT_API}/poe2/Leagues/${encodeURIComponent(league)}`

export const scoutCurrenciesUrl = (league: string, category: string, page: number) =>
  `${leaguePath(league)}/Currencies/ByCategory?${new URLSearchParams({
    category,
    page: String(page),
    perPage: String(SCOUT_PAGE_SIZE),
    dataPoints: '7',
    frequencyHours: '1',
  })}`

interface ScoutItem {
  ApiId?: unknown
  Text?: unknown
  CurrentPrice?: unknown
  CurrentQuantity?: unknown
  PriceLogs?: unknown
}

export interface ScoutPage {
  pages: number
  items: ScoutItem[]
}

const number = (value: unknown): number | undefined => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined
}

export function parseScoutPage(body: unknown): ScoutPage | null {
  const data = body as { Pages?: unknown; Items?: unknown } | null
  if (!data || !Array.isArray(data.Items)) return null
  return { pages: number(data.Pages) ?? 1, items: data.Items as ScoutItem[] }
}

export function scoutOverview(items: ScoutItem[]): MarketOverview {
  const prices: Record<string, MarketPrice> = { exalted: { value: 1 } }
  const names: Record<string, string> = {}
  for (const { ApiId, Text, CurrentPrice, CurrentQuantity } of items) {
    const value = number(CurrentPrice)
    if (typeof ApiId !== 'string' || value === undefined || value <= 0) continue
    const traded = number(CurrentQuantity)
    prices[ApiId] = { value, ...(traded !== undefined && traded >= 0 && { traded }) }
    if (typeof Text === 'string') names[Text.toLowerCase()] ??= ApiId
  }
  prices.exalted = { ...prices.exalted, value: 1 }
  return { primary: 'exalted', prices, names }
}

export function scoutPricesFrom(items: ScoutItem[]): number | undefined {
  let latest: number | undefined
  for (const { PriceLogs } of items) {
    if (!Array.isArray(PriceLogs)) continue
    for (const log of PriceLogs as ({ Price?: unknown; Time?: unknown } | null)[]) {
      if (number(log?.Price) === undefined || typeof log?.Time !== 'string') continue
      const time = Date.parse(log.Time)
      if (Number.isFinite(time) && (latest === undefined || time > latest)) latest = time
    }
  }
  return latest
}
