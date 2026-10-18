import { baseTypeNames } from '../shared/trade/baseTypes'
import { exchangeGroups, type ExchangeGroup } from '../shared/trade/currency'
import { leagueIds, pickLeague } from '../shared/trade/price'
import { parseStats, type TradeStatGroup } from '../shared/trade/query'
import { cache } from './cache'
import type { TradeSite } from './tradeSite'

const DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000
const LEAGUES_MAX_AGE_MS = 60 * 60 * 1000

function loaded<T>(maxAgeMs: number, load: () => Promise<T>, file?: string): () => Promise<T> {
  const data = cache<T>({ file })
  return () => data.get('poe2', maxAgeMs, load).then(({ value }) => value)
}

export class ReferenceData {
  readonly leagues = loaded(LEAGUES_MAX_AGE_MS, () => this.site.request('/api/trade2/data/leagues').then(leagueIds))
  readonly stats: () => Promise<TradeStatGroup[]> = loaded(
    DATA_MAX_AGE_MS,
    () => this.site.request('/api/trade2/data/stats').then(parseStats),
    'trade-stats.json',
  )
  readonly baseTypes = loaded(
    DATA_MAX_AGE_MS,
    () => this.site.request('/api/trade2/data/items').then(baseTypeNames),
    'trade-base-types.json',
  )
  readonly exchange: () => Promise<ExchangeGroup[]> = loaded(
    DATA_MAX_AGE_MS,
    () => this.site.request('/api/trade2/data/static').then(exchangeGroups),
    'trade-exchange.json',
  )

  constructor(private readonly site: TradeSite) {}

  async league(preferred: string | null): Promise<string> {
    return preferred ?? pickLeague(await this.leagues())
  }
}
