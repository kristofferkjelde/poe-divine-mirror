import { Fragment, type ReactNode } from 'react'
import { SLOT_LABELS } from '../../../shared/item/slots'
import type { Mod, ModType, ParsedItem, Requirements } from '../../../shared/item/types'

const MOD_GROUPS: ModType[] = ['enchant', 'rune', 'implicit']
const EXPLICIT_TYPES = new Set<ModType>(['explicit', 'desecrated', 'fractured'])

export function ItemCard({ item, compact = false }: { item: ParsedItem; compact?: boolean }) {
  const header = (
    <header className="item-header">
      <h1>{item.name}</h1>
      {item.baseType && item.baseType !== item.name && <h2>{item.baseType}</h2>}
    </header>
  )
  if (compact) {
    return (
      <article className="item" data-rarity={item.rarity.toLowerCase()}>
        {header}
      </article>
    )
  }

  const sections: ReactNode[] = []

  if (item.category || item.properties.length > 0) {
    sections.push(
      <div key="properties">
        {item.category && <p className="item-muted">{item.category}</p>}
        {item.properties.map((property) => (
          <p key={property.name}>
            <span className="item-muted">{property.value ? `${property.name}: ` : property.name}</span>
            <span className={property.augmented ? 'item-augmented' : 'item-value'}>{property.value}</span>
          </p>
        ))}
      </div>,
    )
  }

  const requirements = formatRequirements(item.requirements)
  if (requirements.length > 0) {
    sections.push(
      <p key="requirements" className="item-muted">
        Requires{' '}
        {requirements.map(([label, value], index) => (
          <Fragment key={label}>
            {index > 0 && ', '}
            {label === 'Level' ? (
              <>
                Level <span className="item-value">{value}</span>
              </>
            ) : (
              <>
                <span className="item-value">{value}</span> {label}
              </>
            )}
          </Fragment>
        ))}
      </p>,
    )
  }

  if (item.sockets || item.itemLevel !== undefined) {
    sections.push(
      <div key="meta">
        {item.itemLevel !== undefined && (
          <p className="item-muted">
            Item Level: <span className="item-value">{item.itemLevel}</span>
          </p>
        )}
        {item.sockets && (
          <p className="item-muted">
            Sockets: <span className="item-value">{item.sockets}</span>
          </p>
        )}
      </div>,
    )
  }

  for (const type of MOD_GROUPS) {
    const mods = item.mods.filter((mod) => mod.type === type)
    if (mods.length > 0) sections.push(<ModList key={type} mods={mods} />)
  }

  const explicits = item.mods.filter((mod) => EXPLICIT_TYPES.has(mod.type))
  if (explicits.length > 0) sections.push(<ModList key="explicit" mods={explicits} />)

  if (item.corrupted || item.mirrored || item.unidentified) {
    sections.push(
      <div key="flags">
        {item.unidentified && <p className="item-flag-unidentified">Unidentified</p>}
        {item.mirrored && <p className="item-augmented">Mirrored</p>}
        {item.corrupted && <p className="item-flag-corrupted">Corrupted</p>}
      </div>,
    )
  }

  return (
    <article className="item" data-rarity={item.rarity.toLowerCase()}>
      {header}
      <div className="item-body">
        {sections.map((section, index) => (
          <Fragment key={index}>
            {index > 0 && <hr className="item-separator" />}
            {section}
          </Fragment>
        ))}
      </div>
      {item.slot && <p className="item-slot">{SLOT_LABELS[item.slot]}</p>}
    </article>
  )
}

function ModList({ mods }: { mods: Mod[] }) {
  return (
    <ul className="item-mods">
      {mods.map((mod, index) => (
        <li key={index} className="item-mod" data-type={mod.type}>
          {mod.affix && (
            <span
              className="item-tier"
              data-best={mod.tier !== undefined && mod.tier <= 2}
              title={mod.affixName ? `${mod.affix} "${mod.affixName}"` : mod.affix}
            >
              {mod.affix === 'prefix' ? 'P' : 'S'}
              {mod.tier}
            </span>
          )}
          {mod.text}
        </li>
      ))}
    </ul>
  )
}

function formatRequirements(requirements: Requirements): Array<[string, number]> {
  const entries: Array<[string, number | undefined]> = [
    ['Level', requirements.level],
    ['Str', requirements.str],
    ['Dex', requirements.dex],
    ['Int', requirements.int],
  ]
  return entries.filter((entry): entry is [string, number] => entry[1] !== undefined)
}
