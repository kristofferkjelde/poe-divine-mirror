import { useState } from 'react'
import { PROFILE_VERSION, stageTitle } from '../../shared/build/profile'
import type { GearComparison } from '../../shared/compare/gear'
import { GEAR_SLOTS, gearSlotsFor, type GearSlot } from '../../shared/gear'
import { SLOT_LABELS } from '../../shared/item/slots'
import { ComparisonView } from './components/ComparisonView'
import { CurrencyView } from './components/CurrencyView'
import { DecisionCard, type Side } from './components/DecisionCard'
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
      <Panel hotkeys={state.hotkeys} locked={state.locked} character={state.character}>
        <div className="window detail">
          <p className="panel-message">{state.message}</p>
        </div>
      </Panel>
    )
  }

  return (
    <Panel key={state.id} hotkeys={state.hotkeys} locked={state.locked} character={state.character}>
      <ItemWindows state={state} />
    </Panel>
  )
}

function ItemWindows({ state }: { state: Extract<OverlayState, { status: 'item' }> }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [shown, setShown] = useState<Partial<Record<Side, GearSlot>>>({})
  const { item, evaluate, comparisons, buildComparisons, equippedTo, build, hotkeys, worth } = state
  const comparison = pick(comparisons, shown.gear)
  const buildComparison = pick(buildComparisons, shown.build)
  const slots = gearSlotsFor(item.slot)
  const comparable = slots.length > 0
  const decided = Boolean(comparison || buildComparison)
  const otherUnsaved = slots.length > 1 && comparisons.length === 1
  const weightsNote = !build
    ? 'General weights. Add your build in Settings.'
    : build.version !== PROFILE_VERSION
      ? `Scored for ${build.name} (outdated: re-import it in Settings)`
      : `Scored for ${[build.name, stageTitle(build)].filter(Boolean).join(' · ')}`

  if (worth) return <CurrencyView item={item} text={state.text} worth={worth} flipped={state.currencyFlipped} />

  if (evaluate.status !== 'closed') {
    return (
      <EvaluateView item={withSearchedBase(item, evaluate)} evaluate={evaluate} />
    )
  }

  return (
    <>
      <div className={decided ? 'window inventory' : 'window detail'}>
        {equippedTo && <GearHint>✓ Saved as your equipped {GEAR_SLOTS[equippedTo].label}</GearHint>}
        {decided ? (
          <DecisionCard
            item={item}
            gear={comparison}
            build={buildComparison}
            gearOther={comparisons.find((result) => result !== comparison)}
            buildOther={buildComparisons.find((result) => result !== buildComparison)}
            onShow={(side, slot) => setShown({ ...shown, [side]: slot })}
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
        {decided && otherUnsaved && item.slot && (
          <GearHint>
            Your other {SLOT_LABELS[item.slot].toLowerCase()} isn't saved yet. Hover it and press {hotkeys.equip}.
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
        <div className="window detail">
          <ComparisonView result={buildComparison} against="build" weightsNote={weightsNote} />
        </div>
      )}
      {detailsOpen && comparison && (
        <div className="window detail">
          <ComparisonView result={comparison} against="gear" />
        </div>
      )}
      {detailsOpen && (
        <div className="window detail">
          <ItemCard item={item} />
        </div>
      )}
    </>
  )
}

const pick = (results: GearComparison[], slot: GearSlot | undefined): GearComparison | null =>
  results.find((result) => result.slot === slot) ?? results[0] ?? null

const withSearchedBase = (item: ParsedItem, evaluate: EvaluateState): ParsedItem =>
  !item.baseType && evaluate.status === 'ready' && evaluate.search.type ? { ...item, baseType: evaluate.search.type } : item
