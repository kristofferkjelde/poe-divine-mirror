import { app, net } from 'electron'
import { randomUUID } from 'node:crypto'
import { toResult, UserFacingError } from '../shared/errors'
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
import { applyEdit, defaultSearch, toTradeQuery, type ItemSearch, type TradeStatGroup } from '../shared/trade/query'
import { jsonFile } from './jsonFile'

const TIMEOUT_MS = 15_000
const STATS_MAX_AGE_MS = 24 * 60 * 60 * 1000
const RESULT_CACHE_MS = 60_000
const FETCH_COUNT = 20
const FETCH_BATCH = 10
const KEPT_SEARCHES = 20

class TradeError extends UserFacingError {}

interface SearchResponse {
  id: string
  result: string[]
  total: number
}

export class TradeClient {
  private readonly statsFile = jsonFile('trade-stats.json')
  private stats: Promise<TradeStatGroup[]> | null = null
  private leagues: Promise<string[]> | null = null
  private blockedUntil = 0
  private readonly cache = new Map<string, { at: number; result: PriceCheckResult }>()
  private readonly searches = new Map<string, ItemSearch>()

  async listLeagues(): Promise<string[]> {
    this.leagues ??= this.request('/api/trade2/data/leagues').then(leagueIds)
    return this.leagues.catch((error) => {
      this.leagues = null
      throw error
    })
  }

  async prepare(text: string): Promise<PrepareResult> {
    try {
      const search = defaultSearch(parseItem(text), await this.loadStats())
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
      const leagueId = league ?? (await this.defaultLeague())
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

      const result: PriceCheckResult = { ok: true, league: leagueId, url, total: response.total, listings }
      this.cache.set(cacheKey, { at: Date.now(), result })
      return result
    } catch (error) {
      return { ...toResult(error, 'Could not reach the trade site'), url }
    }
  }

  private async defaultLeague(): Promise<string> {
    return pickLeague(await this.listLeagues())
  }

  private async loadStats(): Promise<TradeStatGroup[]> {
    this.stats ??= this.readStats().catch((error) => {
      this.stats = null
      throw error
    })
    return this.stats
  }

  private async readStats(): Promise<TradeStatGroup[]> {
    const saved = this.statsFile.read() as { fetchedAt?: number; result?: TradeStatGroup[] } | undefined
    if (saved?.result && saved.fetchedAt && Date.now() - saved.fetchedAt < STATS_MAX_AGE_MS) return saved.result
    try {
      const body = (await this.request('/api/trade2/data/stats')) as { result?: TradeStatGroup[] }
      if (!Array.isArray(body.result)) throw new TradeError('The trade site sent unexpected stat data')
      await this.statsFile.write({ fetchedAt: Date.now(), result: body.result })
      return body.result
    } catch (error) {
      if (saved?.result) return saved.result
      throw error
    }
  }

  private async request(path: string, body?: unknown): Promise<unknown> {
    const wait = this.blockedUntil - Date.now()
    if (wait > 0) throw new TradeError(`The trade site asked us to slow down. Try again in ${Math.ceil(wait / 1000)}s.`)

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
      throw new TradeError(`The trade site asked us to slow down. Try again in ${retry}s.`)
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
