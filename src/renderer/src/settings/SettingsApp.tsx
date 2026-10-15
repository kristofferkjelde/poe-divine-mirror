import type { HotkeyAction } from '../../../shared/settings'
import { HotkeyField } from './HotkeyField'
import { setSettingsState, useSettingsState } from './settingsStore'

const ACTIONS: HotkeyAction[] = ['compare', 'equip']

export function SettingsApp() {
  const state = useSettingsState()

  return (
    <main className="settings">
      <h1>Settings</h1>
      <section className="settings-section">
        <h2>Hotkeys</h2>
        <p className="settings-help">Click a hotkey, then press the new combination. Esc cancels.</p>
        {state ? (
          ACTIONS.map((action) => (
            <HotkeyField
              key={action}
              action={action}
              accelerator={state.settings.hotkeys[action]}
              unavailable={state.unavailable.includes(action)}
            />
          ))
        ) : (
          <p className="settings-help">Loading…</p>
        )}
      </section>
      <footer className="settings-footer">
        <button
          type="button"
          className="settings-reset"
          onClick={async () => setSettingsState(await window.settings.reset())}
        >
          Reset to defaults
        </button>
      </footer>
    </main>
  )
}
