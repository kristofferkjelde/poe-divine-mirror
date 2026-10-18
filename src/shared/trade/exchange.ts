import type { CurrencyIcons } from './currency'
import { TRADE_ORIGIN, type Reliability } from './price'

export const EXCHANGE_TARGETS = ['chaos', 'exalted', 'divine'] as const

export type ExchangeTarget = (typeof EXCHANGE_TARGETS)[number]

export const isExchangeTarget = (value: unknown): value is ExchangeTarget =>
  EXCHANGE_TARGETS.includes(value as ExchangeTarget)

export const TARGET_NAMES: Record<ExchangeTarget, string> = {
  chaos: 'Chaos Orb',
  exalted: 'Exalted Orb',
  divine: 'Divine Orb',
}

export const targetsFor = (name: string): ExchangeTarget[] => EXCHANGE_TARGETS.filter((target) => TARGET_NAMES[target] !== name)

export function targetFor(name: string, preferred: ExchangeTarget): ExchangeTarget {
  const targets = targetsFor(name)
  return targets.includes(preferred) ? preferred : targets[0]
}

export interface ExchangeRate {
  value: number
  low: number
  high: number
  offers: number
  reliability: Reliability
}

export type CurrencyWorthResult =
  | { ok: true; league: string; url: string; currency: string; target: ExchangeTarget; rate: ExchangeRate; icons: CurrencyIcons }
  | { ok: false; error: string; url?: string; retryAt?: number }

export interface StackSize {
  count: number
  max?: number
}

export function stackSize(text: string): StackSize | undefined {
  const match = /^Stack Size:\s*([\d,.\s]+?)(?:\s*\/\s*([\d,.\s]+))?\s*$/m.exec(text.replace(/\r/g, ''))
  if (!match) return undefined
  const count = Number(match[1].replace(/\D/g, ''))
  const max = match[2] ? Number(match[2].replace(/\D/g, '')) : undefined
  return count > 0 ? { count, ...(max && { max }) } : undefined
}

export const exchangeQuery = (want: string, have: ExchangeTarget) => ({
  engine: 'new',
  query: { status: { option: 'online' }, have: [have], want: [want] },
  sort: { have: 'asc' },
})

export const exchangeUrl = (league: string, queryId?: string) =>
  `${TRADE_ORIGIN}/trade2/exchange/poe2/${encodeURIComponent(league)}${queryId ? `/${encodeURIComponent(queryId)}` : ''}`

interface Offer {
  exchange?: { currency?: unknown; amount?: unknown }
  item?: { currency?: unknown; amount?: unknown; stock?: unknown }
}

const SAMPLE = 10

const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0

export function exchangeRate(body: unknown, want: string, have: ExchangeTarget): ExchangeRate | null {
  const response = body as { result?: unknown; total?: unknown } | null
  const results = response?.result && typeof response.result === 'object' ? Object.values(response.result) : []
  const prices = results
    .flatMap((result) => ((result as { listing?: { offers?: Offer[] } } | null)?.listing?.offers ?? []) as Offer[])
    .flatMap(({ exchange, item }) => {
      if (!item || exchange?.currency !== have || (item.currency !== undefined && item.currency !== want)) return []
      if (!positive(exchange.amount) || !positive(item.amount)) return []
      if (typeof item.stock === 'number' && item.stock < item.amount) return []
      return [exchange.amount / item.amount]
    })
    .sort((a, b) => a - b)
  if (prices.length === 0) return null

  const sample = prices.slice(0, SAMPLE)
  const offers = positive(response?.total) ? Math.max(response.total, prices.length) : prices.length
  return {
    value: sample[Math.floor((sample.length - 1) / 2)],
    low: sample[0],
    high: sample[sample.length - 1],
    offers,
    reliability: sample.length < 3 ? 'Very low' : offers < 10 ? 'Low' : offers < 40 ? 'Medium' : 'High',
  }
}

export function formatAmount(value: number): string {
  if (value >= 100) return Math.round(value).toLocaleString('en-US')
  if (value >= 10) return String(Math.round(value * 10) / 10)
  if (value >= 1) return String(Math.round(value * 100) / 100)
  return String(Number(value.toPrecision(2)))
}
