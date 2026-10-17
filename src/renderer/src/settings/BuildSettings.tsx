import { useActionState, useState } from 'react'
import { PROFILE_VERSION, profileWeights, stageTitle, type BuildProfile } from '../../../shared/build/profile'
import { GEAR_SLOT_IDS, GEAR_SLOTS } from '../../../shared/gear'
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
      {stageTitle(build) && (
        <label className="settings-row">
          <span>
            Gear stage
            <small>Which of the build's gear sets to compare against.</small>
            <small className="stage-gear">{stageGear(build)}</small>
          </span>
          <select
            className="settings-select"
            value={build.itemSet}
            onChange={async (event) => setSettingsState(await window.settings.setBuildItemSet(event.target.value))}
          >
            {build.itemSets?.map(({ id, title, sameAs }) => (
              <option key={id} value={id}>
                {sameAs ? `${title} (same gear as ${sameAs})` : title}
              </option>
            ))}
          </select>
        </label>
      )}
      {stageTitle(build) && <StageFiles build={build} />}
      {build.version !== PROFILE_VERSION && (
        <p className="hotkey-status">
          This build was imported by an older version of the app. Click Change and import it again to pick up the latest
          fixes.
        </p>
      )}
      <BuildWeights build={build} />
    </>
  )
}

function StageFiles({ build }: { build: BuildProfile }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const planned = build.itemSets?.filter(({ id }) => build.stageGear?.[id]).map(({ title }) => title) ?? []

  const add = async (input: HTMLInputElement) => {
    const files = [...(input.files ?? [])]
    input.value = ''
    if (files.length === 0) return
    setPending(true)
    const response = await window.settings.addBuildStages(
      await Promise.all(files.map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) }))),
    )
    setPending(false)
    setError(response.ok ? null : response.error)
    if (response.ok) setSettingsState(response.state)
  }

  return (
    <>
      <div className="settings-row">
        <span>
          Stage gear files
          <small>
            Mobalytics often leaves a stage's gear out of the Path of Building code. On the build page, click Download
            Build File and add the zip (or single .build files) here to compare against exactly those items.
          </small>
          {planned.length > 0 && <small className="stage-gear">From .build files: {planned.join(' · ')}</small>}
        </span>
        <label className="hotkey-button" aria-disabled={pending}>
          {pending ? 'Adding…' : 'Add build files'}
          <input
            type="file"
            accept=".build,.zip"
            multiple
            hidden
            disabled={pending}
            onChange={(event) => void add(event.currentTarget)}
          />
        </label>
      </div>
      {error && <p className="hotkey-status">{error}</p>}
    </>
  )
}

function stageGear(build: BuildProfile): string {
  const items = GEAR_SLOT_IDS.flatMap((slot) => {
    const item = build.items[slot]
    if (!item) return []
    const from = build.borrowed?.[slot]
    return [`${GEAR_SLOTS[slot].label}: ${item.name || item.baseType}${from ? ` (from ${from})` : ''}`]
  })
  return items.length > 0 ? items.join(' · ') : 'No gear in this stage'
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
