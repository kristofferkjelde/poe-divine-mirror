import { PROFILE_VERSION } from '../../shared/build/profile'
import { GEAR_SLOT_LABELS, gearSlotsFor } from '../../shared/gear'
import { SLOT_LABELS } from '../../shared/item/slots'
import { ComparisonView } from './components/ComparisonView'
import { GearHint } from './components/GearHint'
import { ItemCard } from './components/ItemCard'
import { Panel } from './components/Panel'
import { EvaluateView } from './components/EvaluateView'
import { openEvaluate, useOverlayState } from './overlayStore'

export function App() {
  const state = useOverlayState()

  if (state.status === 'idle') return null

  if (state.status === 'error') {
    return (
      <Panel hotkeys={state.hotkeys} locked={state.locked}>
        <p className="panel-message">{state.message}</p>
      </Panel>
    )
  }

  const { item, evaluate, comparison, buildComparison, equippedTo, build, hotkeys, locked, capturedAt } = state
  const comparable = gearSlotsFor(item.slot).length > 0
  const buildName =
    build && build.version !== PROFILE_VERSION ? `${build.name} (outdated: re-import it in Settings)` : build?.name

  if (evaluate.status !== 'closed') {
    return (
      <Panel key={capturedAt} hotkeys={hotkeys} locked={locked}>
        <ItemCard item={item} compact />
        <EvaluateView evaluate={evaluate} />
      </Panel>
    )
  }

  return (
    <Panel key={capturedAt} hotkeys={hotkeys} locked={locked}>
      {equippedTo && <GearHint>✓ Saved as your equipped {GEAR_SLOT_LABELS[equippedTo]}</GearHint>}
      {buildComparison && <ComparisonView result={buildComparison} against="build" buildName={buildName} />}
      {comparison && (
        <ComparisonView result={comparison} against="gear" buildName={buildComparison ? null : buildName} />
      )}
      {!equippedTo && !comparison && comparable && item.slot && (
        <GearHint>
          No equipped {SLOT_LABELS[item.slot].toLowerCase()} saved yet. Hover yours and press {hotkeys.equip}.
        </GearHint>
      )}
      <ItemCard item={item} />
      <p className="evaluate-open">
        <button type="button" className="panel-link" onClick={() => void openEvaluate()}>
          ⚖ Evaluate price
        </button>
        <span className="evaluate-note">{hotkeys.price}</span>
      </p>
    </Panel>
  )
}
