import './stub'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { rulesForProfile } from '../../../shared/build/profile'
import { compareWithGear } from '../../../shared/compare/gear'
import { parseItem } from '../../../shared/item/parse'
import { DEFAULT_SETTINGS } from '../../../shared/settings'
import { Panel } from '../components/Panel'
import '../styles.css'
import { BUILD, CANDIDATE, EQUIPPED } from './fixtures'
import { PrototypeSwitcher, useVariant } from './PrototypeSwitcher'
import './prototype.css'
import * as A from './VariantA'
import * as B from './VariantB'
import * as C from './VariantC'

const VARIANTS = { A: A.name, B: B.name, C: C.name }
const COMPONENTS = { A: A.VariantA, B: B.VariantB, C: C.VariantC }

const rules = rulesForProfile(BUILD)
const item = parseItem(CANDIDATE)
const props = {
  item,
  gear: compareWithGear(item, { weapon: parseItem(EQUIPPED) }, rules),
  build: compareWithGear(item, BUILD.items, rules),
  buildName: BUILD.name,
}

function Prototype() {
  const variant = useVariant(Object.keys(VARIANTS)) as keyof typeof COMPONENTS
  const Variant = COMPONENTS[variant]
  return (
    <>
      <div className="prototype-stage">
        <Panel key={variant} hotkeys={DEFAULT_SETTINGS.hotkeys} locked={false}>
          <Variant {...props} />
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
