import { app, net } from 'electron'
import { toResult, UserFacingError } from '../shared/errors'
import type { CurrencyEntry, ExchangeGroup } from '../shared/trade/currency'
import { DEFAULT_TARGET, targetFor, type CurrencyWorthResult, type ExchangeTarget, type MarketSource } from '../shared/trade/exchange'
import {
  inExalted,
  isMarketType,
  marketPrice,
  marketRate,
  ninjaUrl,
  NINJA_ORIGIN,
  parseOverview,
  relayUrl,
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
import { jsonFile } from './jsonFile'
import type { TradeClient } from './trade'

const TIMEOUT_MS = 15_000
const MAX_AGE_MS = 60 * 60 * 1000
const REFRESH_COOLDOWN_MS = 10 * 1000
const KEPT_OVERVIEWS = 40
const NINJA_PAGE = `${NINJA_ORIGIN}/poe2/economy`
const PAGES: Record<MarketSource, string> = { poe2scout: SCOUT_PAGE, 'poe.ninja': NINJA_PAGE }
export const MARKET_PAGES: readonly string[] = Object.values(PAGES)

class MarketError extends UserFacingError {}

export class MarketClient {
  private readonly file = jsonFile('market-prices.json', { compact: true })
  private saved: Promise<Record<string, Saved>> | null = null
  private readonly pending = new Map<string, Promise<Saved>>()

  constructor(private readonly trade: TradeClient) {}

  async worth(text: string, preferred: ExchangeTarget, league: string | null, fresh = false): Promise<CurrencyWorthResult> {
    try {
      const [{ group, entry }, groups, leagueId] = await Promise.all([
        this.trade.exchangeItem(text),
        this.trade.catalog(),
        this.trade.league(league),
      ])
      const target = findTarget(groups, targetFor(entry.id, preferred))
      const [item, worthIn] = await Promise.all([
        this.price(leagueId, group.id, entry, fresh),
        this.price(leagueId, target.group.id, target.entry, fresh),
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
      return {
        ...toResult(error, 'Could not reach the currency market'),
        url: SCOUT_PAGE,
      }
    }
  }

  private async price(league: string, type: string, entry: CurrencyEntry, fresh: boolean) {
    if (!isMarketType(type)) throw new MarketError(`The market has no prices for ${entry.text ?? entry.id}`)
    const { fetchedAt, pricesFrom = fetchedAt, source = 'poe.ninja', overview } = await this.overview(league, type, fresh)
    return { fetchedAt, pricesFrom, source, price: marketPrice(inExalted(overview), entry) }
  }

  private async overview(league: string, type: string, fresh: boolean): Promise<Saved> {
    const key = `${league}\n${type}`
    const saved = await (this.saved ??= this.file.readAsync().then((data) => (isSavedMap(data) ? data : {})))
    const known = saved[key]
    const age = known ? Date.now() - known.fetchedAt : Infinity
    if (age < (fresh ? REFRESH_COOLDOWN_MS : MAX_AGE_MS)) return known

    let loading = this.pending.get(key)
    if (!loading) {
      loading = fetchOverview(league, type, fresh)
        .then(({ overview, pricesFrom, source }) => {
          const latest = { fetchedAt: Date.now(), pricesFrom, source, overview }
          saved[key] = latest
          for (const old of Object.keys(saved)
            .sort((a, b) => saved[b].fetchedAt - saved[a].fetchedAt)
            .slice(KEPT_OVERVIEWS))
            delete saved[old]
          void this.file.write(saved).catch(() => {})
          return latest
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
  pricesFrom?: number
  source?: MarketSource
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

interface Fetched {
  overview: MarketOverview
  pricesFrom: number
  source: MarketSource
}

async function fetchOverview(league: string, type: string, fresh: boolean): Promise<Fetched> {
  return (await fetchScout(league, type, fresh)) ?? fetchNinja(league, type, fresh)
}

async function fetchScout(league: string, type: string, fresh: boolean): Promise<Fetched | null> {
  const category = scoutCategory(type)
  if (!category) return null
  const first = await request(scoutCurrenciesUrl(league, category, 1), fresh)
  const page = first && parseScoutPage(first.body)
  if (!first || !page) return null
  const items = [...page.items]
  for (let next = 2; next <= Math.min(page.pages, SCOUT_MAX_PAGES); next++) {
    const more = await request(scoutCurrenciesUrl(league, category, next), fresh)
    const parsed = more && parseScoutPage(more.body)
    if (!parsed) return null
    items.push(...parsed.items)
  }
  if (items.length === 0) return null
  return {
    overview: scoutOverview(items),
    pricesFrom: Math.min(scoutPricesFrom(items) ?? first.pricesFrom, first.pricesFrom),
    source: 'poe2scout',
  }
}

async function fetchNinja(league: string, type: string, fresh: boolean): Promise<Fetched> {
  const response =
    (!fresh && (await request(relayUrl(league, type), false))) || (await request(ninjaUrl(league, type), fresh))
  if (!response) throw new MarketError('Could not reach poe2scout or poe.ninja for currency prices')
  const overview = parseOverview(response.body)
  if (!overview) throw new MarketError("poe.ninja's currency market sent unexpected data")
  return { overview, pricesFrom: response.pricesFrom, source: 'poe.ninja' }
}

async function request(url: string, fresh: boolean): Promise<{ body: unknown; pricesFrom: number } | null> {
  try {
    const response = await net.fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `DivineMirror/${app.getVersion()} (+https://www.poe-divine-mirror.com)`,
      },
      cache: fresh ? 'no-store' : 'default',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      console.warn(`Price request failed with HTTP ${response.status}: ${url}`)
      return null
    }
    const { headers } = response
    const pricesFrom = snapshotTime(
      { lastModified: headers.get('last-modified'), date: headers.get('date'), age: headers.get('age') },
      Date.now(),
    )
    return { body: await response.json(), pricesFrom }
  } catch (error) {
    console.warn(`Price request failed: ${url}`, error)
    return null
  }
}
