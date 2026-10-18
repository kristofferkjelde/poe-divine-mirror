import { Suspense, use } from 'react'
import type { Settings } from '../../../shared/settings'
import { EXCHANGE_TARGETS, isExchangeTarget, TARGET_NAMES } from '../../../shared/trade/exchange'
import { setSettingsState } from './settingsStore'

let leagues: Promise<string[]> | null = null
const loadLeagues = () => (leagues ??= window.settings.listLeagues())

export function TradeSettings({ settings }: { settings: Settings }) {
  return (
    <>
      <label className="settings-row">
        <span>
          League
          <small>Price checks search the official trade site in this league.</small>
        </span>
        <Suspense fallback={<select className="settings-select" disabled />}>
          <LeagueSelect league={settings.league} />
        </Suspense>
      </label>
      <label className="settings-row">
        <span>
          Currency worth in
          <small>Hovering currency shows its worth from the currency exchange in this.</small>
        </span>
        <select
          className="settings-select"
          value={settings.currencyTarget}
          onChange={async (event) => {
            if (isExchangeTarget(event.target.value)) setSettingsState(await window.settings.setCurrencyTarget(event.target.value))
          }}
        >
          {EXCHANGE_TARGETS.map((target) => (
            <option key={target} value={target}>
              {TARGET_NAMES[target]}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

function LeagueSelect({ league }: { league: string | null }) {
  const options = use(loadLeagues())
  const known = league === null || options.includes(league) ? options : [league, ...options]

  return (
    <select
      className="settings-select"
      value={league ?? ''}
      onChange={async (event) => setSettingsState(await window.settings.setLeague(event.target.value || null))}
    >
      <option value="">Current league</option>
      {known.map((id) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </select>
  )
}
