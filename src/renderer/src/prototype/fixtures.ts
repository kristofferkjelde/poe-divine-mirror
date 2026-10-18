import chaosArt from './art/CurrencyRerollRare.webp'
import divineArt from './art/CurrencyModValues.webp'
import exaltedArt from './art/CurrencyAddModToRare.webp'
import regalArt from './art/CurrencyUpgradeToRare.webp'

export type Target = 'chaos' | 'exalted' | 'divine'

export interface Currency {
  id: string
  name: string
  short: string
  art: string
  inExalted: number
}

export const TARGETS: Record<Target, Currency> = {
  chaos: { id: 'chaos', name: 'Chaos Orb', short: 'Chaos', art: chaosArt, inExalted: 4.8 },
  exalted: { id: 'exalted', name: 'Exalted Orb', short: 'Exalted', art: exaltedArt, inExalted: 1 },
  divine: { id: 'divine', name: 'Divine Orb', short: 'Divine', art: divineArt, inExalted: 412 },
}

export const TARGET_ORDER: Target[] = ['chaos', 'exalted', 'divine']

export interface Held extends Currency {
  stack: number
  maxStack: number
}

export const ITEMS: Record<string, Held> = {
  divine: { ...TARGETS.divine, stack: 7, maxStack: 20 },
  chaos: { ...TARGETS.chaos, stack: 18, maxStack: 20 },
  regal: { id: 'regal', name: 'Regal Orb', short: 'Regal', art: regalArt, inExalted: 0.6, stack: 31, maxStack: 40 },
}

export interface Rate {
  value: number
  low: number
  high: number
  offers: number
  reliability: number
}

export function rate(item: Held, target: Target): Rate {
  const value = item.inExalted / TARGETS[target].inExalted
  const offers = item.id === 'divine' ? 38 : item.id === 'chaos' ? 64 : 21
  return { value, low: value * 0.97, high: value * 1.05, offers, reliability: offers > 50 ? 4 : offers > 30 ? 3 : 2 }
}

export const LEAGUE = 'Rise of the Abyssal'

export const choices = (item: Held) => TARGET_ORDER.filter((target) => target !== item.id)

export function formatAmount(value: number): string {
  if (value >= 100) return Math.round(value).toLocaleString('en-US')
  if (value >= 10) return String(Math.round(value * 10) / 10)
  if (value >= 1) return String(Math.round(value * 100) / 100)
  return String(Number(value.toPrecision(2)))
}
