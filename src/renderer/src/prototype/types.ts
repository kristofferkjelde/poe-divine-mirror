import type { ParsedItem } from '../../../shared/item/types'
import type { PriceCheckResult } from '../../../shared/trade/price'
import type { ItemSearch } from '../../../shared/trade/query'

export interface VariantProps {
  item: ParsedItem
  search: ItemSearch
  result: Extract<PriceCheckResult, { ok: true }>
}
