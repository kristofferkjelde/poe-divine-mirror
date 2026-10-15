import { ItemCard } from './components/ItemCard'
import { Panel } from './components/Panel'
import { useOverlayState } from './overlayStore'

export function App() {
  const state = useOverlayState()

  if (state.status === 'idle') return null

  return (
    <Panel>
      {state.status === 'item' ? (
        <ItemCard key={state.capturedAt} item={state.item} />
      ) : (
        <p className="panel-message">{state.message}</p>
      )}
    </Panel>
  )
}
