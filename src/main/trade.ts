import { randomUUID } from 'node:crypto'
import { toResult } from '../shared/errors'
import type { ParsedItem } from '../shared/item/types'
import { parseItem } from '../shared/item/parse'
import {
  parseListings,
  parseSearch,
  tradeUrl,
  type Listing,
  type PrepareResult,
  type PriceCheck,
  type PriceCheckResult,
  type SearchResponse,
} from '../shared/trade/price'
import { magicBaseType } from '../shared/trade/baseTypes'
import { iconsFor, iconsOf, type CurrencyIcons } from '../shared/trade/currency'
import { applyEdit, defaultSearch, toTradeQuery, type ItemSearch } from '../shared/trade/query'
import { cache } from './cache'
import type { ReferenceData } from './referenceData'
import { SlowDownError, type TradeSite } from './tradeSite'

const RESULT_CACHE_MS = 60_000
const KEPT_RESULTS = 20
const FETCH_COUNT = 20
const FETCH_BATCH = 10
const KEPT_SEARCHES = 20

class ListingsError extends Error {
  constructor(
    readonly url: string,
    readonly reason: unknown,
  ) {
    super('Could not fetch the listings')
  }
}

export class TradeSearch {
  private readonly results = cache<PriceCheck>({ keep: KEPT_RESULTS, staleOnError: false })
  private readonly searches = new Map<string, ItemSearch>()

  constructor(
    private readonly site: TradeSite,
    private readonly data: ReferenceData,
  ) {}

  async prepare(text: string): Promise<PrepareResult> {
    try {
      const search = defaultSearch(await this.withBaseType(parseItem(text)), await this.data.stats())
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
    try {
      const leagueId = await this.data.league(league)
      const key = `${leagueId}\n${JSON.stringify(query)}`
      const { value } = await this.results.get(key, RESULT_CACHE_MS, () => this.find(leagueId, query))
      return { ok: true, ...value }
    } catch (error) {
      const reason = error instanceof ListingsError ? error.reason : error
      return {
        ...toResult(reason, 'Could not reach the trade site'),
        ...(error instanceof ListingsError && { url: error.url }),
        ...(reason instanceof SlowDownError && { retryAt: reason.retryAt }),
      }
    }
  }

  private async find(league: string, query: unknown): Promise<PriceCheck> {
    const icons = this.icons()
    const found = parseSearch(await this.site.request(`/api/trade2/search/poe2/${encodeURIComponent(league)}`, query))
    const url = tradeUrl(league, found.id)
    const listings = await this.listings(found).catch((error: unknown) => {
      throw new ListingsError(url, error)
    })
    return {
      league,
      url,
      total: found.total,
      listings,
      icons: iconsFor(await icons, listings.map((listing) => listing.currency)),
    }
  }

  private async listings({ id, result }: SearchResponse): Promise<Listing[]> {
    const listings: Listing[] = []
    const ids = result.slice(0, FETCH_COUNT)
    for (let start = 0; start < ids.length; start += FETCH_BATCH) {
      const batch = ids.slice(start, start + FETCH_BATCH)
      listings.push(...parseListings(await this.site.request(`/api/trade2/fetch/${batch.join(',')}?query=${encodeURIComponent(id)}`)))
    }
    return listings
  }

  private icons(): Promise<CurrencyIcons> {
    return this.data
      .exchange()
      .then((groups) => iconsOf(groups.flatMap((group) => group.entries)))
      .catch(() => ({}))
  }

  private async withBaseType(item: ParsedItem): Promise<ParsedItem> {
    if (item.rarity !== 'Magic' || item.baseType) return item
    const types = await this.data.baseTypes().catch(() => [])
    const baseType = magicBaseType(item.name, types)
    return baseType ? { ...item, baseType } : item
  }
}
