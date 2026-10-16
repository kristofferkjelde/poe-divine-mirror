import type { Theme } from '../theme'
import { Keys } from './Keys'
import { Screen } from './Screen'

type Cell = {
  art: string
  name: string
  col: number
  row: number
  w?: number
  h?: number
  rarity: 'normal' | 'magic' | 'rare' | 'unique' | 'currency'
  target?: boolean
}

const cells: Cell[] = [
  { art: 'spear', name: 'Barbed Spear', col: 1, row: 1, h: 4, rarity: 'rare' },
  { art: 'helmet', name: 'Death Mask', col: 2, row: 1, w: 2, h: 2, rarity: 'magic' },
  { art: 'amulet', name: 'Azure Amulet', col: 4, row: 1, rarity: 'rare' },
  { art: 'divine', name: 'Divine Orb', col: 5, row: 1, rarity: 'currency' },
  { art: 'boots', name: 'Storm Trail, Daggerfoot Shoes', col: 4, row: 2, w: 2, h: 2, rarity: 'rare', target: true },
  { art: 'gloves', name: 'Buckled Wraps', col: 2, row: 3, w: 2, h: 2, rarity: 'magic' },
  { art: 'ring', name: 'Amethyst Ring', col: 4, row: 4, rarity: 'normal' },
  { art: 'exalted', name: 'Exalted Orb', col: 5, row: 4, rarity: 'currency' },
]

export function HeroDemo({ theme }: { theme: Theme }) {
  return (
    <div
      className="demo"
      role="img"
      aria-label="Animation: hovering a pair of boots in the inventory and pressing Alt+D opens the Compare window, which says Equip it"
    >
      <div className="demo-scene">
        <div className="demo-inventory">
          <p className="demo-inventory-title">Inventory</p>
          <div className="demo-grid">
            {cells.map((cell) => (
              <span
                key={cell.art}
                className={cell.target ? 'demo-item demo-target' : 'demo-item'}
                data-rarity={cell.rarity}
                style={{
                  gridColumn: `${cell.col} / span ${cell.w ?? 1}`,
                  gridRow: `${cell.row} / span ${cell.h ?? 1}`,
                }}
              >
                <img src={`/items/${cell.art}.webp`} alt="" title={cell.name} draggable={false} />
              </span>
            ))}
          </div>
        </div>
        <svg className="demo-cursor" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.4 L18 13.4 Z"
            fill="#f4e3b2"
            stroke="#2a1a05"
            strokeWidth="1.4"
          />
        </svg>
        <span className="demo-ping" aria-hidden />
        <Keys keys={['Alt', 'D']} className="demo-keys" />
        <div className="demo-overlay">
          <Screen name="compare" theme={theme} alt="" eager />
        </div>
      </div>
    </div>
  )
}
