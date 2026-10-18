import type { ParsedItem } from '../item/types'
import type { CurrencyEntry } from './currency'
import type { ExchangeRate } from './market'
import { TRADE_ORIGIN } from './price'

export type ExchangeTarget = string

export const DEFAULT_TARGET = 'chaos'

export const isExchangeTarget = (value: unknown): value is ExchangeTarget =>
  typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value)

export const targetFor = (currency: string, preferred: ExchangeTarget): ExchangeTarget =>
  preferred !== currency ? preferred : currency === DEFAULT_TARGET ? 'divine' : DEFAULT_TARGET

export function exchangeNames(item: Pick<ParsedItem, 'name' | 'baseType' | 'properties'>): string[] {
  const base = item.baseType ?? item.name
  const number = (name: string) => item.properties.find((property) => property.name === name)?.value.match(/\d+/)?.[0]
  const level = number('Level')
  const tier = number('Waystone Tier')
  return [
    ...(level ? [`${base} (Level ${level})`] : []),
    ...(tier ? [`${base} (Tier ${tier})`] : []),
    item.name,
    base,
  ].filter((name, index, all) => name && all.indexOf(name) === index)
}

export type CurrencyWorthResult =
  | {
      ok: true
      league: string
      updatedAt: number
      url: string
      item: CurrencyEntry
      group: string
      target: CurrencyEntry
      rate: ExchangeRate
    }
  | { ok: false; error: string; url?: string }

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

export const exchangeUrl = (league: string) => `${TRADE_ORIGIN}/trade2/exchange/poe2/${encodeURIComponent(league)}`

export function formatAmount(value: number): string {
  if (value >= 100) return Math.round(value).toLocaleString('en-US')
  if (value >= 10) return String(Math.round(value * 10) / 10)
  if (value >= 1) return String(Math.round(value * 100) / 100)
  return String(Number(value.toPrecision(2)))
}
