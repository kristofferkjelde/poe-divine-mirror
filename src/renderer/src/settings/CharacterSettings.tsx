import { useState } from 'react'
import { characterLabel, MAX_CHARACTERS, MAX_NAME_LENGTH, type CharacterList } from '../../../shared/characters'
import type { SettingsState } from '../../../shared/ipc'
import { setSettingsState } from './settingsStore'

const update = async (request: Promise<SettingsState>) => setSettingsState(await request)

export function CharacterSettings({ list }: { list: CharacterList }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const active = list.characters.find(({ id }) => id === list.active) ?? list.characters[0]
  const label = characterLabel(list, active.id)

  const rename = (name: string) => {
    if (name.trim() !== active.name) void update(window.settings.renameCharacter(active.id, name))
  }

  return (
    <>
      <div className="settings-row">
        <span>
          Playing
          <small>Each character keeps its own build and saved gear. You can also switch by clicking its name in the popup's bottom bar.</small>
        </span>
        <select
          className="settings-select"
          value={list.active}
          onChange={(event) => void update(window.settings.selectCharacter(event.target.value))}
        >
          {list.characters.map(({ id }) => (
            <option key={id} value={id}>
              {characterLabel(list, id)}
            </option>
          ))}
        </select>
      </div>
      <form
        key={active.id}
        className="settings-row"
        onSubmit={(event) => {
          event.preventDefault()
          rename(String(new FormData(event.currentTarget).get('name') ?? ''))
        }}
      >
        <label htmlFor="character-name">
          Name
          <small>Write it exactly as in the game, so the app can switch to it by itself when it levels up, dies or chats.</small>
        </label>
        <input
          id="character-name"
          name="name"
          className="settings-input"
          defaultValue={active.name}
          placeholder="Character name"
          maxLength={MAX_NAME_LENGTH}
          spellCheck={false}
          onBlur={(event) => rename(event.currentTarget.value)}
        />
      </form>
      <div className="settings-actions character-actions">
        {list.characters.length > 1 && (
          <button
            type="button"
            className="settings-reset"
            data-confirm={confirming === active.id}
            onClick={() => {
              if (confirming !== active.id) return setConfirming(active.id)
              setConfirming(null)
              void update(window.settings.removeCharacter(active.id))
            }}
          >
            {confirming === active.id ? `Click again to remove ${label} and its gear` : `Remove ${label}`}
          </button>
        )}
        {list.characters.length < MAX_CHARACTERS && (
          <button type="button" className="hotkey-button" onClick={() => void update(window.settings.addCharacter(''))}>
            Add character
          </button>
        )}
      </div>
    </>
  )
}
