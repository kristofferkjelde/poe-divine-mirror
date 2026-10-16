import { useState } from 'react'
import { PROFILE_VERSION } from '../../shared/build/profile'
import { GEAR_SLOTS, gearSlotsFor } from '../../shared/gear'
import { SLOT_LABELS } from '../../shared/item/slots'
import { ComparisonView } from './components/ComparisonView'
import { DecisionCard } from './components/DecisionCard'
import { EvaluateView } from './components/EvaluateView'
import { GearHint } from './components/GearHint'
import { ItemCard } from './components/ItemCard'
import { Panel } from './components/Panel'
import type { ParsedItem } from '../../shared/item/types'
import { openEvaluate, useOverlayState, type EvaluateState, type OverlayState } from './overlayStore'

export function App() {
  const state = useOverlayState()

  if (state.status === 'idle') return null

  if (state.status === 'error') {
    return (
      <Panel hotkeys={state.hotkeys} locked={state.locked}>
        <div className="window">
          <p className="panel-message">{state.message}</p>
        </div>
      </Panel>
    )
  }

  return (
    <Panel key={state.id} hotkeys={state.hotkeys} locked={state.locked}>
      <ItemWindows state={state} />
    </Panel>
  )
}

function ItemWindows({ state }: { state: Extract<OverlayState, { status: 'item' }> }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { item, evaluate, comparison, buildComparison, equippedTo, build, hotkeys } = state
  const comparable = gearSlotsFor(item.slot).length > 0
  const decided = Boolean(comparison || buildComparison)
  const weightsNote = !build
    ? 'General weights. Add your build in Settings.'
    : build.version !== PROFILE_VERSION
      ? `Scored for ${build.name} (outdated: re-import it in Settings)`
      : `Scored for ${build.name}`

  if (evaluate.status !== 'closed') {
    return (
      <div className="window">
        <ItemCard item={withSearchedBase(item, evaluate)} compact />
        <EvaluateView evaluate={evaluate} />
      </div>
    )
  }

  return (
    <>
      <div className={decided ? 'window inventory' : 'window'}>
        {equippedTo && <GearHint>✓ Saved as your equipped {GEAR_SLOTS[equippedTo].label}</GearHint>}
        {decided ? (
          <DecisionCard
            item={item}
            gear={comparison}
            build={buildComparison}
            weightsNote={weightsNote}
            equipHotkey={hotkeys.equip}
            detailsOpen={detailsOpen}
            onToggleDetails={() => setDetailsOpen(!detailsOpen)}
          />
        ) : (
          <ItemCard item={item} />
        )}
        {!decided && !equippedTo && comparable && item.slot && (
          <GearHint>
            No equipped {SLOT_LABELS[item.slot].toLowerCase()} saved yet. Hover yours and press {hotkeys.equip}.
          </GearHint>
        )}
        <p className="evaluate-open">
          <button type="button" className="panel-link" onClick={() => void openEvaluate()}>
            ⚖ Evaluate price
          </button>
          <span className="evaluate-note">{hotkeys.price}</span>
        </p>
      </div>
      {detailsOpen && buildComparison && (
        <div className="window">
          <ComparisonView result={buildComparison} against="build" weightsNote={weightsNote} />
        </div>
      )}
      {detailsOpen && comparison && (
        <div className="window">
          <ComparisonView result={comparison} against="gear" />
        </div>
      )}
      {detailsOpen && (
        <div className="window">
          <ItemCard item={item} />
        </div>
      )}
    </>
  )
}

const withSearchedBase = (item: ParsedItem, evaluate: EvaluateState): ParsedItem =>
  !item.baseType && evaluate.status === 'ready' && evaluate.search.type ? { ...item, baseType: evaluate.search.type } : item
