import type { TradeStatGroup } from './query'

export interface PseudoTotal {
  key: string
  label: string
  value: number
  statId: string
  sources: number[]
}

interface PseudoRule {
  key: string
  label: (value: number) => string
  stat: RegExp
  contributions: Array<[RegExp, number]>
}

const STRENGTH: Array<[RegExp, number]> = [
  [/^\+# to Strength$/, 1],
  [/^\+# to Strength and (?:Dexterity|Intelligence)$/, 1],
  [/^\+# to all Attributes$/, 1],
]
const INTELLIGENCE: Array<[RegExp, number]> = [
  [/^\+# to Intelligence$/, 1],
  [/^\+# to (?:Strength|Dexterity) and Intelligence$/, 1],
  [/^\+# to all Attributes$/, 1],
]
const scaled = (rules: Array<[RegExp, number]>, factor: number): Array<[RegExp, number]> =>
  rules.map(([pattern, weight]) => [pattern, weight * factor])

const RULES: PseudoRule[] = [
  {
    key: 'pseudo-life',
    label: (value) => `+${value} total maximum Life`,
    stat: /^\+# total maximum Life$/i,
    contributions: [[/^\+# to maximum Life$/, 1], ...scaled(STRENGTH, 2)],
  },
  {
    key: 'pseudo-mana',
    label: (value) => `+${value} total maximum Mana`,
    stat: /^\+# total maximum Mana$/i,
    contributions: [[/^\+# to maximum Mana$/, 1], ...scaled(INTELLIGENCE, 2)],
  },
  {
    key: 'pseudo-elemental-resistance',
    label: (value) => `+${value}% total Elemental Resistance`,
    stat: /^\+#% total Elemental Resistance$/i,
    contributions: [
      [/^\+#% to (?:Fire|Cold|Lightning) Resistance$/, 1],
      [/^\+#% to (?:Fire|Cold|Lightning) and (?:Fire|Cold|Lightning) Resistances$/, 2],
      [/^\+#% to all Elemental Resistances$/, 3],
    ],
  },
  {
    key: 'pseudo-attributes',
    label: (value) => `+${value} total to Attributes`,
    stat: /^\+# total (?:to )?(?:all )?Attributes$/i,
    contributions: [
      [/^\+# to (?:Strength|Dexterity|Intelligence)$/, 1],
      [/^\+# to (?:Strength|Dexterity) and (?:Dexterity|Intelligence)$/, 2],
      [/^\+# to all Attributes$/, 3],
    ],
  },
]

export interface PseudoSource {
  index: number
  template: string
  value: number
}

export function pseudoTotals(sources: PseudoSource[], groups: TradeStatGroup[]): PseudoTotal[] {
  const pseudo = groups.find((group) => group.id === 'pseudo')?.entries ?? []
  return RULES.flatMap((rule) => {
    const stat = pseudo.find((entry) => rule.stat.test(entry.text))
    if (!stat) return []
    let value = 0
    const used: number[] = []
    const parts: string[] = []
    for (const source of sources) {
      const weight = rule.contributions.find(([pattern]) => pattern.test(source.template))?.[1]
      if (weight === undefined) continue
      value += source.value * weight
      used.push(source.index)
      parts.push(weight === 1 ? `${source.value}` : `${source.value}×${weight}`)
    }
    if (used.length === 0 || value <= 0) return []
    const label = parts.length > 1 || parts[0] !== `${value}` ? `${rule.label(value)} (${parts.join(' + ')})` : rule.label(value)
    return [{ key: rule.key, label, value, statId: stat.id, sources: used }]
  })
}
