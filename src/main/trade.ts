import { app, net } from 'electron'
import { ItemParseError, parseItem } from '../shared/item/parse'
import {
  leagueIds,
  parseListings,
  pickLeague,
  rateLimitWait,
  TRADE_ORIGIN,
  tradeUrl,
  type PriceCheckResult,
} from '../shared/trade/price'
import { buildSearch, PriceCheckUnsupported, type SearchPlan, type TradeStatGroup } from '../shared/trade/query'
import { jsonFile } from './jsonFile'

const TIMEOUT_MS = 15_000
const STATS_MAX_AGE_MS = 24 * 60 * 60 * 1000
const RESULT_CACHE_MS = 60_000
const FETCH_COUNT = 10
const RELAX_BELOW = 5

class TradeError extends Error {}

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

  async listLeagues(): Promise<string[]> {
    this.leagues ??= this.request('/api/trade2/data/leagues').then(leagueIds)
    return this.leagues.catch((error) => {
      this.leagues = null
      throw error
    })
  }

  async priceCheck(text: string, league: string | null): Promise<PriceCheckResult> {
    const cached = this.cache.get(`${league}\n${text}`)
    if (cached && Date.now() - cached.at < RESULT_CACHE_MS) return cached.result

    let url: string | undefined
    try {
      const item = parseItem(text)
      const leagueId = league ?? (await this.defaultLeague())
      const stats = await this.loadStats()

      let plan = buildSearch(item, stats)
      let search = await this.search(leagueId, plan)
      if (search.total < RELAX_BELOW) {
        const relaxed = buildSearch(item, stats, true)
        if (relaxed.relaxed) {
          plan = relaxed
          search = await this.search(leagueId, plan)
        }
      }
      url = tradeUrl(leagueId, search.id)

      const ids = search.result.slice(0, FETCH_COUNT)
      const listings =
        ids.length === 0
          ? []
          : parseListings(await this.request(`/api/trade2/fetch/${ids.join(',')}?query=${encodeURIComponent(search.id)}`))

      const result: PriceCheckResult = {
        ok: true,
        league: leagueId,
        url,
        total: search.total,
        listings,
        matched: plan.matched,
        unmatched: plan.unmatched,
        relaxed: plan.relaxed,
      }
      this.cache.set(`${league}\n${text}`, { at: Date.now(), result })
      return result
    } catch (error) {
      if (error instanceof TradeError || error instanceof PriceCheckUnsupported || error instanceof ItemParseError) {
        return { ok: false, error: error.message, url }
      }
      console.error('Price check failed', error)
      return { ok: false, error: 'Could not reach the trade site', url }
    }
  }

  private async defaultLeague(): Promise<string> {
    return pickLeague(await this.listLeagues())
  }

  private search(league: string, plan: SearchPlan): Promise<SearchResponse> {
    return this.request(`/api/trade2/search/poe2/${encodeURIComponent(league)}`, plan.query) as Promise<SearchResponse>
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
          'User-Agent': `DivineMirror/${app.getVersion()} (+https://github.com/kristofferkjelde/poe-item-checker)`,
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
