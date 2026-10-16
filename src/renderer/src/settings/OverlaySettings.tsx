import { isUiScale, UI_SCALES, type Settings } from '../../../shared/settings'
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
      <label className="settings-row">
        <span>
          UI size
          <small>Makes the overlay and this window bigger.</small>
        </span>
        <select
          className="settings-select"
          value={settings.uiScale}
          onChange={async (event) => {
            const scale = Number(event.target.value)
            if (isUiScale(scale)) setSettingsState(await window.settings.setUiScale(scale))
          }}
        >
          {UI_SCALES.map((scale) => (
            <option key={scale} value={scale}>
              {scale}%
            </option>
          ))}
        </select>
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
