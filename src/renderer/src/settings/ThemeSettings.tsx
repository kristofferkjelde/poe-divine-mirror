import { THEME_LABELS, THEMES, type Theme } from '../../../shared/settings'
import { setSettingsState } from './settingsStore'

export function ThemeSettings({ theme }: { theme: Theme }) {
  return (
    <div className="theme-picker" role="radiogroup" aria-label="Theme">
      {THEMES.map((id) => (
        <label key={id} className="theme-option" data-theme-preview={id}>
          <input
            type="radio"
            name="theme"
            value={id}
            checked={theme === id}
            onChange={async () => setSettingsState(await window.settings.setTheme(id))}
          />
          <span className="theme-swatch" aria-hidden="true">
            <i />
          </span>
          <strong>{THEME_LABELS[id].name}</strong>
          <small>{THEME_LABELS[id].hint}</small>
        </label>
      ))}
    </div>
  )
}
