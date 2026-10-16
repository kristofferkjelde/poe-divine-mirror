import { useState } from 'react'
import { withScale, type ItemSearch } from '../../../shared/trade/query'

export function useSearchState(initial: ItemSearch) {
  const [search, setSearch] = useState(initial)
  return {
    search,
    toggle: (key: string) =>
      setSearch({ ...search, filters: search.filters.map((filter) => (filter.key === key ? { ...filter, enabled: !filter.enabled } : filter)) }),
    setScale: (scale: number) => setSearch(withScale(search, scale)),
  }
}
