import type { Settings } from '../../../shared/settings'
import { setSettingsState } from './settingsStore'

export function OverlaySettings({ settings }: { settings: Settings }) {
  return (
    <>
      <label className="settings-row">
        <span>
          Lock position
          <small>When unlocked, drag the panel anywhere in game and it stays there.</small>
        </span>
        <input
          type="checkbox"
          className="settings-toggle"
          checked={settings.overlayLocked}
          onChange={async (event) => setSettingsState(await window.settings.setLocked(event.target.checked))}
        />
      </label>
      <div className="settings-row">
        <span>
          Position
          <small>{settings.overlayPosition ? 'Where you last dragged it' : 'Centered on screen'}</small>
        </span>
        <button
          type="button"
          className="settings-reset"
          disabled={!settings.overlayPosition}
          onClick={async () => setSettingsState(await window.settings.resetPosition())}
        >
          Center
        </button>
      </div>
    </>
  )
}
