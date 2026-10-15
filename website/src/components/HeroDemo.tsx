import { ComparePanel } from './ComparePanel'
import { ItemArt, type ItemKind } from './ItemArt'
import { Keys } from './Keys'

type Cell = { kind: ItemKind; col: number; row: number; w?: number; h?: number; rarity: string; target?: boolean }

const cells: Cell[] = [
  { kind: 'spear', col: 1, row: 1, h: 3, rarity: 'rare' },
  { kind: 'helm', col: 2, row: 1, w: 2, h: 2, rarity: 'magic' },
  { kind: 'amulet', col: 4, row: 1, rarity: 'unique' },
  { kind: 'orb', col: 5, row: 1, rarity: 'currency' },
  { kind: 'ring', col: 4, row: 2, rarity: 'rare', target: true },
  { kind: 'orb', col: 5, row: 2, rarity: 'currency' },
  { kind: 'boots', col: 2, row: 3, w: 2, h: 2, rarity: 'normal' },
  { kind: 'gloves', col: 4, row: 3, w: 2, h: 2, rarity: 'magic' },
]

export function HeroDemo() {
  return (
    <div className="demo" aria-label="Animation: hovering a ring in the inventory and pressing Alt+D shows an upgrade comparison">
      <div className="demo-scene">
        <div className="demo-inventory">
          <p className="demo-inventory-title">Inventory</p>
          <div className="demo-grid">
            {cells.map((c, i) => (
              <span
                key={i}
                className={c.target ? 'demo-item demo-target' : 'demo-item'}
                data-rarity={c.rarity}
                style={{ gridColumn: `${c.col} / span ${c.w ?? 1}`, gridRow: `${c.row} / span ${c.h ?? 1}` }}
              >
                <ItemArt kind={c.kind} />
              </span>
            ))}
          </div>
        </div>
        <svg className="demo-cursor" viewBox="0 0 24 24" aria-hidden>
          <path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.4 L18 13.4 Z" fill="#f4e3b2" stroke="#2a1a05" strokeWidth="1.4" />
        </svg>
        <span className="demo-ping" aria-hidden />
        <Keys keys={['Alt', 'D']} className="demo-keys" />
        <div className="demo-overlay">
          <ComparePanel />
        </div>
      </div>
    </div>
  )
}
