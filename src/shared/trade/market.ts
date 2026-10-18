import type { CurrencyEntry } from './currency'
import type { Reliability } from './price'

export const MARKET_TYPES = [
  'Currency',
  'Fragments',
  'Abyss',
  'UncutGems',
  'LineageSupportGems',
  'Essences',
  'SoulCores',
  'Idols',
  'Runes',
  'Ritual',
  'Expedition',
  'Delirium',
  'Breach',
  'Verisium',
] as const

export const MARKET_ORIGIN = 'https://www.poe-divine-mirror.com'
export const NINJA_ORIGIN = 'https://poe.ninja'

export const isMarketType = (value: string): boolean => (MARKET_TYPES as readonly string[]).includes(value)

export const relayUrl = (league: string, type: string) =>
  `${MARKET_ORIGIN}/api/exchange?${new URLSearchParams({ league, type })}`

export const ninjaUrl = (league: string, type: string) =>
  `${NINJA_ORIGIN}/poe2/api/economy/exchange/current/overview?${new URLSearchParams({ league, type })}`

export interface MarketPrice {
  value: number
  traded?: number
}

export interface MarketOverview {
  primary: string
  prices: Record<string, MarketPrice>
  names: Record<string, string>
}

interface Line {
  id?: unknown
  primaryValue?: unknown
  volumePrimaryValue?: unknown
}

interface Named {
  id?: unknown
  name?: unknown
}

const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0

export function parseOverview(body: unknown): MarketOverview | null {
  const data = body as {
    core?: { primary?: unknown; rates?: unknown; items?: unknown }
    lines?: unknown
    items?: unknown
  } | null
  const primary = data?.core?.primary
  if (typeof primary !== 'string' || !Array.isArray(data?.lines)) return null

  const prices: Record<string, MarketPrice> = { [primary]: { value: 1 } }
  const rates = data.core?.rates
  if (rates && typeof rates === 'object') {
    for (const [id, rate] of Object.entries(rates)) if (positive(rate)) prices[id] = { value: 1 / rate }
  }
  for (const { id, primaryValue, volumePrimaryValue } of data.lines as Line[]) {
    if (typeof id !== 'string' || !positive(primaryValue)) continue
    prices[id] = {
      value: primaryValue,
      ...(typeof volumePrimaryValue === 'number' &&
        volumePrimaryValue >= 0 && {
          traded: volumePrimaryValue / primaryValue,
        }),
    }
  }

  const names: Record<string, string> = {}
  for (const list of [data.items, data.core?.items]) {
    if (!Array.isArray(list)) continue
    for (const { id, name } of list as Named[]) {
      if (typeof id === 'string' && typeof name === 'string') names[name.toLowerCase()] ??= id
    }
  }
  return { primary, prices, names }
}

export function marketPrice(overview: MarketOverview, entry: CurrencyEntry): MarketPrice | undefined {
  const byId = overview.prices[entry.id]
  if (byId) return byId
  const id = entry.text && overview.names[entry.text.toLowerCase()]
  return id ? overview.prices[id] : undefined
}

export interface ResponseTimes {
  lastModified: string | null
  date: string | null
  age: string | null
}

export function snapshotTime({ lastModified, date, age }: ResponseTimes, now: number): number {
  const modified = lastModified ? Date.parse(lastModified) : NaN
  if (modified <= now) return modified
  const sent = date ? Date.parse(date) : NaN
  const seconds = Number(age ?? 0)
  if (Number.isFinite(sent) && Number.isFinite(seconds) && sent <= now) return sent - seconds * 1000
  return now
}

export interface ExchangeRate {
  value: number
  traded?: number
  reliability: Reliability
}

export function marketRate(item: MarketPrice, target: MarketPrice): ExchangeRate {
  const volume = item.traded ?? (target.traded === undefined ? undefined : (target.traded * target.value) / item.value)
  return {
    value: item.value / target.value,
    ...(item.traded !== undefined && { traded: item.traded }),
    reliability:
      volume === undefined ? 'Low' : volume < 5 ? 'Very low' : volume < 50 ? 'Low' : volume < 500 ? 'Medium' : 'High',
  }
}
