import { useActionState, useState } from 'react'
import { profileWeights, type BuildProfile } from '../../../shared/build/profile'
import { setSettingsState } from './settingsStore'

export function BuildSettings({ build }: { build: BuildProfile | null }) {
  const [replacing, setReplacing] = useState(false)

  if (!build || replacing) return <BuildImport onDone={() => setReplacing(false)} canCancel={Boolean(build)} />

  return (
    <>
      <div className="settings-row">
        <span>
          {build.name}
          <small>{describe(build)}</small>
        </span>
        <span className="settings-actions">
          <button type="button" className="settings-reset" onClick={() => setReplacing(true)}>
            Change
          </button>
          <button
            type="button"
            className="settings-reset"
            onClick={async () => setSettingsState(await window.settings.removeBuild())}
          >
            Remove
          </button>
        </span>
      </div>
      <BuildWeights build={build} />
    </>
  )
}

function describe(build: BuildProfile): string {
  const focus = [build.focus.attack && 'Attacks', build.focus.spell && 'Spells', build.focus.minion && 'Minions']
  const defences: string[] = build.defences.map((defence) => DEFENCE_LABELS[defence])
  if (build.lowLife) defences.push('Low life')
  return [...focus, ...defences].filter(Boolean).join(' · ')
}

const DEFENCE_LABELS = { armour: 'Armour', evasion: 'Evasion', energyShield: 'Energy Shield' } as const

function BuildImport({ onDone, canCancel }: { onDone: () => void; canCancel: boolean }) {
  const [error, submit, pending] = useActionState(async (_previous: string | null, form: FormData) => {
    const response = await window.settings.importBuild(String(form.get('build') ?? ''))
    if (!response.ok) return response.error
    setSettingsState(response.state)
    onDone()
    return null
  }, null)

  return (
    <form className="build-import" action={submit}>
      <textarea
        name="build"
        rows={3}
        spellCheck={false}
        placeholder="Paste a Path of Building code, or a pobb.in, poe.ninja, Maxroll or Mobalytics link"
        disabled={pending}
        required
      />
      <p className="settings-help">
        On Mobalytics, open the build and click <strong>Copy Code</strong> next to Path of Building, then paste it here.
      </p>
      {error && <p className="hotkey-status">{error}</p>}
      <div className="settings-actions">
        {canCancel && (
          <button type="button" className="settings-reset" onClick={onDone} disabled={pending}>
            Cancel
          </button>
        )}
        <button type="submit" className="hotkey-button" disabled={pending}>
          {pending ? 'Importing…' : 'Import build'}
        </button>
      </div>
    </form>
  )
}

function BuildWeights({ build }: { build: BuildProfile }) {
  const weights = profileWeights(build)
  const hasCustom = Object.keys(build.custom).length > 0

  const save = async (stat: string, input: HTMLInputElement) => {
    const value = input.value.trim() === '' ? null : Number(input.value)
    if (value !== null && !Number.isFinite(value)) return
    setSettingsState(await window.settings.setBuildWeight(stat, value))
  }

  return (
    <>
      <p className="settings-help">
        How much each point of a stat is worth when comparing items. ★ marks stats your build's gear has. Change a number
        to fine tune it; clear it to go back to the build's value.
      </p>
      <ul className="build-weights">
        {weights.map(({ stat, weight, fromBuild, custom }) => (
          <li key={stat} className="build-weight" data-custom={custom}>
            <label htmlFor={`weight-${stat}`}>
              {fromBuild && <span className="build-star">★ </span>}
              {stat}
            </label>
            <input
              key={`${stat}:${weight}`}
              id={`weight-${stat}`}
              type="number"
              step="0.1"
              defaultValue={weight}
              onBlur={(event) => {
                if (event.currentTarget.value !== String(weight)) void save(stat, event.currentTarget)
              }}
              onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            />
          </li>
        ))}
      </ul>
      {hasCustom && (
        <div className="settings-actions">
          <button
            type="button"
            className="settings-reset"
            onClick={async () => setSettingsState(await window.settings.resetBuildWeights())}
          >
            Reset weights to the build's
          </button>
        </div>
      )}
    </>
  )
}
