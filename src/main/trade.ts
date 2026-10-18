import { app, net } from 'electron'
import { randomUUID } from 'node:crypto'
import { toResult, UserFacingError } from '../shared/errors'
import type { ParsedItem } from '../shared/item/types'
import { parseItem } from '../shared/item/parse'
import {
  leagueIds,
  parseListings,
  pickLeague,
  rateLimitWait,
  TRADE_ORIGIN,
  tradeUrl,
  type Listing,
  type PrepareResult,
  type PriceCheckResult,
} from '../shared/trade/price'
import { baseTypeNames, magicBaseType } from '../shared/trade/baseTypes'
import { exchangeGroups, findEntry, iconsFor, iconsOf, type CurrencyEntry, type ExchangeGroup } from '../shared/trade/currency'
import { exchangeNames } from '../shared/trade/exchange'
import { applyEdit, defaultSearch, toTradeQuery, type ItemSearch, type TradeStatGroup } from '../shared/trade/query'
import { diskBacked, expiring } from './cached'

const TIMEOUT_MS = 15_000
const DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000
const LEAGUES_MAX_AGE_MS = 60 * 60 * 1000
const RESULT_CACHE_MS = 60_000
const FETCH_COUNT = 20
const FETCH_BATCH = 10
const KEPT_SEARCHES = 20

class TradeError extends UserFacingError {}

class SlowDownError extends TradeError {
  constructor(readonly retryAt: number) {
    super(`The trade site asked us to slow down. Try again in ${Math.ceil((retryAt - Date.now()) / 1000)}s.`)
  }
}

interface SearchResponse {
  id: string
  result: string[]
  total: number
}

export class TradeClient {
  private readonly leagues = expiring(() => this.request('/api/trade2/data/leagues').then(leagueIds), LEAGUES_MAX_AGE_MS)
  private readonly stats = expiring(
    diskBacked(
      'trade-stats.json',
      DATA_MAX_AGE_MS,
      () => this.request('/api/trade2/data/stats').then((body) => (body as { result?: TradeStatGroup[] }).result as TradeStatGroup[]),
      (result) => (Array.isArray(result) ? null : new TradeError('The trade site sent unexpected stat data')),
    ),
    DATA_MAX_AGE_MS,
  )
  private readonly baseTypes = expiring(
    diskBacked(
      'trade-base-types.json',
      DATA_MAX_AGE_MS,
      () => this.request('/api/trade2/data/items').then(baseTypeNames),
      (result) => (result.length > 0 ? null : new TradeError('The trade site sent unexpected item data')),
    ),
    DATA_MAX_AGE_MS,
  )
  private readonly exchange = expiring(
    diskBacked(
      'trade-exchange.json',
      DATA_MAX_AGE_MS,
      () => this.request('/api/trade2/data/static').then(exchangeGroups),
      (result) => (result.length > 0 ? null : new TradeError('The trade site sent unexpected currency data')),
    ),
    DATA_MAX_AGE_MS,
  )
  private blockedUntil = 0
  private readonly cache = new Map<string, { at: number; result: PriceCheckResult }>()
  private readonly searches = new Map<string, ItemSearch>()

  listLeagues(): Promise<string[]> {
    return this.leagues()
  }

  async prepare(text: string): Promise<PrepareResult> {
    try {
      const search = defaultSearch(await this.withBaseType(parseItem(text)), await this.stats())
      const id = randomUUID()
      this.searches.set(id, search)
      if (this.searches.size > KEPT_SEARCHES) {
        const [oldest] = this.searches.keys()
        this.searches.delete(oldest)
      }
      return { ok: true, id, search }
    } catch (error) {
      return toResult(error, 'Could not reach the trade site')
    }
  }

  async search(id: string, edit: unknown, league: string | null): Promise<PriceCheckResult> {
    const search = this.searches.get(id)
    if (!search) return { ok: false, error: 'This price check expired. Press the hotkey again.' }
    const query = toTradeQuery(applyEdit(search, edit))
    const cacheKey = `${league}\n${JSON.stringify(query)}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.at < RESULT_CACHE_MS) return cached.result

    let url: string | undefined
    try {
      const leagueId = league ?? pickLeague(await this.leagues())
      const response = (await this.request(
        `/api/trade2/search/poe2/${encodeURIComponent(leagueId)}`,
        query,
      )) as SearchResponse
      url = tradeUrl(leagueId, response.id)

      const listings: Listing[] = []
      const ids = response.result.slice(0, FETCH_COUNT)
      for (let start = 0; start < ids.length; start += FETCH_BATCH) {
        const batch = ids.slice(start, start + FETCH_BATCH)
        listings.push(
          ...parseListings(await this.request(`/api/trade2/fetch/${batch.join(',')}?query=${encodeURIComponent(response.id)}`)),
        )
      }

      const icons = iconsFor(
        iconsOf((await this.exchange().catch(() => [])).flatMap((group) => group.entries)),
        listings.map((listing) => listing.currency),
      )
      const result: PriceCheckResult = { ok: true, league: leagueId, url, total: response.total, listings, icons }
      for (const [key, entry] of this.cache) if (Date.now() - entry.at >= RESULT_CACHE_MS) this.cache.delete(key)
      this.cache.set(cacheKey, { at: Date.now(), result })
      return result
    } catch (error) {
      return {
        ...toResult(error, 'Could not reach the trade site'),
        url,
        ...(error instanceof SlowDownError && { retryAt: error.retryAt }),
      }
    }
  }

  catalog(): Promise<ExchangeGroup[]> {
    return this.exchange()
  }

  async exchangeItem(text: string): Promise<{ group: ExchangeGroup; entry: CurrencyEntry }> {
    const item = parseItem(text)
    const found = findEntry(await this.exchange(), exchangeNames(item))
    if (!found) throw new TradeError(`The currency exchange does not list ${item.baseType ?? item.name}`)
    return found
  }

  async league(league: string | null): Promise<string> {
    return league ?? pickLeague(await this.leagues())
  }

  private async withBaseType(item: ParsedItem): Promise<ParsedItem> {
    if (item.rarity !== 'Magic' || item.baseType) return item
    const types = await this.baseTypes().catch(() => [])
    const baseType = magicBaseType(item.name, types)
    return baseType ? { ...item, baseType } : item
  }

  private async request(path: string, body?: unknown): Promise<unknown> {
    if (this.blockedUntil > Date.now()) throw new SlowDownError(this.blockedUntil)

    let response: Response
    try {
      response = await net.fetch(`${TRADE_ORIGIN}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Accept: 'application/json',
          'User-Agent': `DivineMirror/${app.getVersion()} (+https://github.com/kristofferkjelde/poe-divine-mirror)`,
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      throw new TradeError('Could not reach the trade site')
    }

    const limitWait = Math.max(
      rateLimitWait(response.headers.get('x-rate-limit-ip'), response.headers.get('x-rate-limit-ip-state')),
      rateLimitWait(response.headers.get('x-rate-limit-account'), response.headers.get('x-rate-limit-account-state')),
    )
    if (limitWait > 0) this.blockedUntil = Date.now() + limitWait

    if (response.status === 429) {
      const retry = Number(response.headers.get('retry-after')) || 60
      this.blockedUntil = Math.max(this.blockedUntil, Date.now() + retry * 1000)
      throw new SlowDownError(this.blockedUntil)
    }
    if (!response.ok) {
      const message = await response
        .json()
        .then((json) => (json as { error?: { message?: string } }).error?.message)
        .catch(() => undefined)
      throw new TradeError(message ? `Trade site: ${message}` : `The trade site answered ${response.status}`)
    }
    return response.json()
  }
}
