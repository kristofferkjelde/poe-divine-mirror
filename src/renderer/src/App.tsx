import { GEAR_SLOT_LABELS, gearSlotsFor } from '../../shared/gear'
import { HOTKEYS } from '../../shared/ipc'
import { SLOT_LABELS } from '../../shared/item/slots'
import { ComparisonView } from './components/ComparisonView'
import { GearHint } from './components/GearHint'
import { ItemCard } from './components/ItemCard'
import { Panel } from './components/Panel'
import { useOverlayState } from './overlayStore'

export function App() {
  const state = useOverlayState()

  if (state.status === 'idle') return null

  if (state.status === 'error') {
    return (
      <Panel>
        <p className="panel-message">{state.message}</p>
      </Panel>
    )
  }

  const { item, comparison, equippedTo, capturedAt } = state
  const comparable = gearSlotsFor(item.slot).length > 0

  return (
    <Panel key={capturedAt}>
      {equippedTo && <GearHint>✓ Saved as your equipped {GEAR_SLOT_LABELS[equippedTo]}</GearHint>}
      {comparison && <ComparisonView result={comparison} />}
      {!equippedTo && !comparison && comparable && item.slot && (
        <GearHint>
          No equipped {SLOT_LABELS[item.slot].toLowerCase()} saved yet. Hover yours and press {HOTKEYS.equip}.
        </GearHint>
      )}
      <ItemCard item={item} />
    </Panel>
  )
}
