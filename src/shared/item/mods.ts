import type { Mod } from './types'

export const isRangeMod = (mod: Mod): boolean => mod.values.length === 2 && /# to #/.test(mod.template)

export function modValue(mod: Mod): number | undefined {
  if (mod.values.length === 0) return undefined
  if (isRangeMod(mod)) return (mod.values[0] + mod.values[1]) / 2
  return mod.values[0]
}
