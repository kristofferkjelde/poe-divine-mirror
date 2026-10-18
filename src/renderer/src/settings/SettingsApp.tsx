import { HOTKEY_ACTIONS } from '../../../shared/settings'
import { BuildSettings } from './BuildSettings'
import { CharacterSettings } from './CharacterSettings'
import { HotkeyField } from './HotkeyField'
import { OverlaySettings } from './OverlaySettings'
import { ThemeSettings } from './ThemeSettings'
import { TradeSettings } from './TradeSettings'
import { setSettingsState, useSettingsState } from './settingsStore'

export function SettingsApp() {
  const state = useSettingsState()

  return (
    <main className="settings">
      <h1>Settings</h1>
      {state && (
        <section className="settings-section">
          <h2>Character</h2>
          <CharacterSettings list={state.characters} />
        </section>
      )}
      {state && (
        <section className="settings-section">
          <h2>Build</h2>
          <BuildSettings key={state.characters.active} build={state.build} />
        </section>
      )}
      <section className="settings-section">
        <h2>Hotkeys</h2>
        <p className="settings-help">Click a hotkey, then press the new combination. Esc cancels.</p>
        {state ? (
          HOTKEY_ACTIONS.map((action) => (
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
      {state && (
        <section className="settings-section">
          <h2>Overlay</h2>
          <OverlaySettings settings={state.settings} />
        </section>
      )}
      {state && (
        <section className="settings-section">
          <h2>Theme</h2>
          <ThemeSettings theme={state.settings.theme} />
        </section>
      )}
      {state && (
        <section className="settings-section">
          <h2>Trade</h2>
          <TradeSettings settings={state.settings} />
        </section>
      )}
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
