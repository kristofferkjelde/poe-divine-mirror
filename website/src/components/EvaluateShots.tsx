import { useState } from 'react'
import type { Theme } from '../theme'
import { Screen } from './Screen'

const TABS = {
  filters: {
    label: 'Filters',
    alt: 'Evaluate window, Filters tab: the item, its price of about 2 exalted orbs, and the mods to search for',
  },
  listings: {
    label: 'Listings',
    alt: 'Evaluate window, Listings tab: the eight cheapest matching items on the trade site with their prices',
  },
} as const

type Tab = keyof typeof TABS

export function EvaluateShots({ theme }: { theme: Theme }) {
  const [tab, setTab] = useState<Tab>('filters')
  return (
    <div className="shot-tabs">
      <div className="tabs" role="tablist" aria-label="Evaluate window">
        {(Object.keys(TABS) as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="evaluate-shot"
            onClick={() => setTab(id)}
          >
            {TABS[id].label}
          </button>
        ))}
      </div>
      <div id="evaluate-shot" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <Screen name={tab} theme={theme} alt={TABS[tab].alt} />
      </div>
    </div>
  )
}
