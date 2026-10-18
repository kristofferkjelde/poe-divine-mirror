import { toResult, UserFacingError } from '../shared/errors'
import { parseItem } from '../shared/item/parse'
import { findByName, findEntry, type CurrencyEntry, type ExchangeGroup, type FoundEntry } from '../shared/trade/currency'
import {
  DEFAULT_TARGET,
  exchangeNames,
  targetFor,
  type CatalogResult,
  type CurrencyWorthResult,
  type ExchangeTarget,
  type MarketSource,
} from '../shared/trade/exchange'
import {
  inExalted,
  isMarketType,
  marketPrice,
  marketRate,
  ninjaUrl,
  NINJA_ORIGIN,
  parseOverview,
  relayUrl,
  responseTimes,
  snapshotTime,
  type MarketOverview,
} from '../shared/trade/market'
import {
  parseScoutPage,
  SCOUT_MAX_PAGES,
  SCOUT_PAGE,
  scoutCategory,
  scoutCurrenciesUrl,
  scoutOverview,
  scoutPricesFrom,
} from '../shared/trade/scout'
import { cache } from './cache'
import { apiHeaders, get } from './http'
import type { ReferenceData } from './referenceData'

const MAX_AGE_MS = 60 * 60 * 1000
const REFRESH_COOLDOWN_MS = 10 * 1000
const KEPT_OVERVIEWS = 40
const NINJA_PAGE = `${NINJA_ORIGIN}/poe2/economy`
const PAGES: Record<MarketSource, string> = { poe2scout: SCOUT_PAGE, 'poe.ninja': NINJA_PAGE }
export const MARKET_PAGES: readonly string[] = Object.values(PAGES)

class MarketError extends UserFacingError {}

interface Fetched {
  overview: MarketOverview
  pricesFrom: number
  source: MarketSource
}

type CacheMode = 'default' | 'no-store'

interface Source {
  name: string
  fetch: (league: string, type: string, cache: CacheMode) => Promise<Fetched>
}

export class MarketClient {
  private readonly overviews = cache<Fetched>({ file: 'market-prices.json', keep: KEPT_OVERVIEWS })

  constructor(private readonly data: ReferenceData) {}

  async catalog(): Promise<CatalogResult> {
    try {
      return { ok: true, groups: (await this.data.exchange()).filter((group) => isMarketType(group.id)) }
    } catch (error) {
      return toResult(error, 'Could not reach the trade site')
    }
  }

  async worth(text: string, preferred: ExchangeTarget, league: string | null, refresh = false): Promise<CurrencyWorthResult> {
    try {
      const [groups, leagueId] = await Promise.all([this.data.exchange(), this.data.league(league)])
      const { group, entry } = exchangeItem(groups, text)
      const target = exchangeTarget(groups, targetFor(entry.id, preferred))
      const [item, worthIn] = await Promise.all([
        this.price(leagueId, group.id, entry, refresh),
        this.price(leagueId, target.group.id, target.entry, refresh),
      ])
      if (!item.price) throw new MarketError(`Nobody has traded ${entry.text ?? entry.id} in ${leagueId} lately`)
      if (!worthIn.price)
        throw new MarketError(`No market price for ${target.entry.text ?? target.entry.id} in ${leagueId}`)
      return {
        ok: true,
        league: leagueId,
        updatedAt: Math.min(item.pricesFrom, worthIn.pricesFrom),
        fetchedAt: Math.min(item.fetchedAt, worthIn.fetchedAt),
        source: item.source,
        url: PAGES[item.source],
        item: entry,
        group: group.label,
        target: target.entry,
        rate: marketRate(item.price, worthIn.price),
      }
    } catch (error) {
      return { ...toResult(error, 'Could not reach the currency market'), url: SCOUT_PAGE }
    }
  }

  private async price(league: string, type: string, entry: CurrencyEntry, refresh: boolean) {
    if (!isMarketType(type)) throw new MarketError(`The market has no prices for ${entry.text ?? entry.id}`)
    const { value, fetchedAt } = await this.overviews.get(
      `${league}\n${type}`,
      refresh ? REFRESH_COOLDOWN_MS : MAX_AGE_MS,
      () => fetchOverview(league, type, refresh),
    )
    return { fetchedAt, pricesFrom: value.pricesFrom, source: value.source, price: marketPrice(value.overview, entry) }
  }
}

function exchangeItem(groups: ExchangeGroup[], text: string): FoundEntry {
  const item = parseItem(text)
  const found = findByName(groups, exchangeNames(item))
  if (!found) throw new MarketError(`The currency exchange does not list ${item.baseType ?? item.name}`)
  return found
}

function exchangeTarget(groups: ExchangeGroup[], id: string): FoundEntry {
  const found = findEntry(groups, (entry) => entry.id === id) ?? findEntry(groups, (entry) => entry.id === DEFAULT_TARGET)
  if (!found) throw new MarketError(`The currency exchange does not list ${id}`)
  return found
}

const scout: Source = {
  name: 'poe2scout',
  async fetch(league, type, cache) {
    const category = scoutCategory(type)
    if (!category) throw new Error(`poe2scout has no ${type} category`)
    const first = await load(scoutCurrenciesUrl(league, category, 1), cache)
    const page = parseScoutPage(first.body)
    const more = await Promise.all(
      Array.from({ length: Math.min(page.pages, SCOUT_MAX_PAGES) - 1 }, (_, index) =>
        load(scoutCurrenciesUrl(league, category, index + 2), cache).then(({ body }) => parseScoutPage(body).items),
      ),
    )
    const items = [...page.items, ...more.flat()]
    if (items.length === 0) throw new Error(`poe2scout has no ${type} prices in ${league}`)
    return {
      overview: scoutOverview(items),
      pricesFrom: Math.min(scoutPricesFrom(items) ?? first.sentAt, first.sentAt),
      source: 'poe2scout',
    }
  },
}

const ninjaSource = (name: string, url: (league: string, type: string) => string): Source => ({
  name,
  async fetch(league, type, cache) {
    const { body, sentAt } = await load(url(league, type), cache)
    return { overview: inExalted(parseOverview(body)), pricesFrom: sentAt, source: 'poe.ninja' }
  },
})

const relay = ninjaSource('poe.ninja via poe-divine-mirror.com', relayUrl)
const direct = ninjaSource('poe.ninja', ninjaUrl)

async function fetchOverview(league: string, type: string, refresh: boolean): Promise<Fetched> {
  const sources = refresh ? [scout, direct] : [scout, relay, direct]
  const reasons: string[] = []
  for (const source of sources) {
    try {
      return await source.fetch(league, type, refresh ? 'no-store' : 'default')
    } catch (error) {
      reasons.push(`${source.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  console.warn(`No ${type} prices for ${league}\n${reasons.join('\n')}`)
  throw new MarketError('Could not reach poe2scout or poe.ninja for currency prices')
}

async function load(url: string, cache: CacheMode): Promise<{ body: unknown; sentAt: number }> {
  const response = await get(url, { cache, headers: apiHeaders() })
  return { body: await response.json(), sentAt: snapshotTime(responseTimes(response.headers), Date.now()) }
}
