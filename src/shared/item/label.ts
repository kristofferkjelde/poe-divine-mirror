import type { ParsedItem } from './types'

const PLACEHOLDER_NAMES = new Set(['', 'New Item', 'Unknown item'])

export function itemLabel({ name, baseType }: Pick<ParsedItem, 'name' | 'baseType'>): string {
  if (PLACEHOLDER_NAMES.has(name)) return baseType ?? 'Unnamed item'
  if (!baseType || name.includes(baseType)) return name
  return `${name}, ${baseType}`
}
