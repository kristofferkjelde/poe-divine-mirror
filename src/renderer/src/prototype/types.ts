import type { GearComparison } from '../../../shared/compare/gear'
import type { ParsedItem } from '../../../shared/item/types'

export interface VariantProps {
  item: ParsedItem
  gear: GearComparison | null
  build: GearComparison | null
  buildName: string
}
