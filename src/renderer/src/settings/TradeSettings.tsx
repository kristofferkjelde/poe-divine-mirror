import { Suspense, use } from 'react'
import type { Settings } from '../../../shared/settings'
import { setSettingsState } from './settingsStore'

const LEAGUES_RETRY_MS = 30_000

let leagues: Promise<string[]> | null = null
const loadLeagues = () =>
  (leagues ??= window.settings.listLeagues().then((result) => {
    if (result.ok) return result.leagues
    setTimeout(() => (leagues = null), LEAGUES_RETRY_MS)
    return []
  }))

export function TradeSettings({ settings }: { settings: Settings }) {
  return (
    <label className="settings-row">
      <span>
        League
        <small>Price checks search the official trade site in this league.</small>
      </span>
      <Suspense fallback={<select className="settings-select" disabled />}>
        <LeagueSelect league={settings.league} />
      </Suspense>
    </label>
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
