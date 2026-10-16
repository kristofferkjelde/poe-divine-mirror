import { magicBaseType } from '../trade/baseTypes'
import art from './art.json'
import type { ParsedItem } from './types'

export const ART_ORIGIN = 'https://raw.githubusercontent.com/repoe-fork/poe2/f45ff3e83f4a6309ef1697b4c9d0db4e69db4baf/data/Art/2DItems/'

const bases: Record<string, string> = art.bases
const uniques: Record<string, string> = art.uniques
const baseNames = Object.keys(bases)
const foundInName = new Map<string, string | undefined>()

function baseFromName(name: string): string | undefined {
  if (!foundInName.has(name)) foundInName.set(name, magicBaseType(name, baseNames))
  return foundInName.get(name)
}

export function itemArt(item: Pick<ParsedItem, 'rarity' | 'name' | 'baseType'>): string | undefined {
  const path =
    (item.rarity === 'Unique' ? uniques[item.name] : undefined) ??
    bases[item.baseType ?? ''] ??
    bases[item.name] ??
    bases[baseFromName(item.name) ?? '']
  return path && `${ART_ORIGIN}${path.split('/').map(encodeURIComponent).join('/')}.webp`
}
