import './stub'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DEFAULT_SETTINGS } from '../../../shared/settings'
import { Panel } from '../components/Panel'
import '../styles.css'
import { ITEM, RESULT, SEARCH } from './fixtures'
import { PrototypeSwitcher, useVariant } from './PrototypeSwitcher'
import './prototype.css'
import * as A from './VariantA'
import * as B from './VariantB'
import * as C from './VariantC'

const VARIANTS = { A: A.name, B: B.name, C: C.name }
const COMPONENTS = { A: A.VariantA, B: B.VariantB, C: C.VariantC }

function Prototype() {
  const variant = useVariant(Object.keys(VARIANTS)) as keyof typeof COMPONENTS
  const Variant = COMPONENTS[variant]
  return (
    <>
      <div className="prototype-stage">
        <Panel key={variant} hotkeys={DEFAULT_SETTINGS.hotkeys} locked={false}>
          <Variant item={ITEM} search={SEARCH} result={RESULT} />
        </Panel>
      </div>
      {import.meta.env.DEV || import.meta.env.MODE === 'prototype' ? <PrototypeSwitcher variants={VARIANTS} current={variant} /> : null}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Prototype />
  </StrictMode>,
)
