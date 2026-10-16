import { useState } from 'react'
import { itemArt } from '../../../shared/item/art'
import type { ParsedItem } from '../../../shared/item/types'

const GLYPHS: Array<[RegExp, string]> = [
  [/sceptre|wand|staff|talisman/i, '⚚'],
  [/spear|bow|sword|axe|mace|flail|quarterstaff|crossbow|claw|dagger/i, '⚔'],
  [/ring/i, '◯'],
  [/amulet/i, '❖'],
  [/helmet/i, '⛑'],
  [/shield|buckler|focus|quiver/i, '⛨'],
]

const glyph = (itemClass: string) => GLYPHS.find(([pattern]) => pattern.test(itemClass))?.[1] ?? '◆'

export function ItemArt({ item }: { item: ParsedItem }) {
  const src = itemArt(item)
  const [failed, setFailed] = useState<string>()
  if (!src || failed === src) {
    return (
      <span className="item-art item-art-glyph" aria-hidden>
        {glyph(item.itemClass)}
      </span>
    )
  }
  return <img className="item-art" src={src} alt="" draggable={false} onError={() => setFailed(src)} />
}
