import { app, net } from 'electron'
import { toResult, UserFacingError } from '../shared/errors'
import type { CurrencyEntry, ExchangeGroup } from '../shared/trade/currency'
import { DEFAULT_TARGET, targetFor, type CurrencyWorthResult, type ExchangeTarget } from '../shared/trade/exchange'
import {
  isMarketType,
  marketPrice,
  marketRate,
  ninjaUrl,
  NINJA_ORIGIN,
  parseOverview,
  relayUrl,
  type MarketOverview,
} from '../shared/trade/market'
import { jsonFile } from './jsonFile'
import type { TradeClient } from './trade'

const TIMEOUT_MS = 15_000
const MAX_AGE_MS = 60 * 60 * 1000
const KEPT_OVERVIEWS = 40
export const MARKET_PAGE = `${NINJA_ORIGIN}/poe2/economy`

class MarketError extends UserFacingError {}

export class MarketClient {
  private readonly file = jsonFile('market-prices.json', { compact: true })
  private saved: Promise<Record<string, Saved>> | null = null
  private readonly pending = new Map<string, Promise<Saved>>()

  constructor(private readonly trade: TradeClient) {}

  async worth(text: string, preferred: ExchangeTarget, league: string | null): Promise<CurrencyWorthResult> {
    try {
      const [{ group, entry }, groups, leagueId] = await Promise.all([
        this.trade.exchangeItem(text),
        this.trade.catalog(),
        this.trade.league(league),
      ])
      const target = findTarget(groups, targetFor(entry.id, preferred))
      const [item, worthIn] = await Promise.all([
        this.price(leagueId, group.id, entry),
        this.price(leagueId, target.group.id, target.entry),
      ])
      if (!item.price) throw new MarketError(`Nobody has traded ${entry.text ?? entry.id} in ${leagueId} lately`)
      if (!worthIn.price)
        throw new MarketError(`No market price for ${target.entry.text ?? target.entry.id} in ${leagueId}`)
      return {
        ok: true,
        league: leagueId,
        updatedAt: Math.min(item.fetchedAt, worthIn.fetchedAt),
        url: MARKET_PAGE,
        item: entry,
        group: group.label,
        target: target.entry,
        rate: marketRate(item.price, worthIn.price),
      }
    } catch (error) {
      return {
        ...toResult(error, 'Could not reach the currency market'),
        url: MARKET_PAGE,
      }
    }
  }

  private async price(league: string, type: string, entry: CurrencyEntry) {
    if (!isMarketType(type)) throw new MarketError(`The market has no prices for ${entry.text ?? entry.id}`)
    const { fetchedAt, overview } = await this.overview(league, type)
    return { fetchedAt, price: marketPrice(overview, entry) }
  }

  private async overview(league: string, type: string): Promise<Saved> {
    const key = `${league}\n${type}`
    const saved = await (this.saved ??= this.file.readAsync().then((data) => (isSavedMap(data) ? data : {})))
    const known = saved[key]
    if (known && Date.now() - known.fetchedAt < MAX_AGE_MS) return known

    let loading = this.pending.get(key)
    if (!loading) {
      loading = fetchOverview(league, type)
        .then((overview) => {
          const fresh = { fetchedAt: Date.now(), overview }
          saved[key] = fresh
          for (const old of Object.keys(saved)
            .sort((a, b) => saved[b].fetchedAt - saved[a].fetchedAt)
            .slice(KEPT_OVERVIEWS))
            delete saved[old]
          void this.file.write(saved).catch(() => {})
          return fresh
        })
        .catch((error) => {
          if (known) return known
          throw error
        })
        .finally(() => this.pending.delete(key))
      this.pending.set(key, loading)
    }
    return loading
  }
}

interface Saved {
  fetchedAt: number
  overview: MarketOverview
}

const isSavedMap = (data: unknown): data is Record<string, Saved> =>
  typeof data === 'object' &&
  data !== null &&
  Object.values(data).every(
    (value: Partial<Saved> | null) =>
      typeof value?.fetchedAt === 'number' && typeof value.overview?.prices === 'object',
  )

function findTarget(groups: ExchangeGroup[], id: string): { group: ExchangeGroup; entry: CurrencyEntry } {
  for (const wanted of [id, DEFAULT_TARGET]) {
    for (const group of groups) {
      const entry = group.entries.find((candidate) => candidate.id === wanted)
      if (entry) return { group, entry }
    }
  }
  throw new MarketError('The currency exchange does not list Chaos Orbs')
}

async function fetchOverview(league: string, type: string): Promise<MarketOverview> {
  const body = (await request(relayUrl(league, type))) ?? (await request(ninjaUrl(league, type)))
  if (body === null) throw new MarketError("Could not reach poe.ninja's currency market")
  const overview = parseOverview(body)
  if (!overview) throw new MarketError("poe.ninja's currency market sent unexpected data")
  return overview
}

async function request(url: string): Promise<unknown> {
  try {
    const response = await net.fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `DivineMirror/${app.getVersion()} (+https://www.poe-divine-mirror.com)`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}
