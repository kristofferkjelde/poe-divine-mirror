import type { Slot } from '../item/types'
import { DERIVED } from './stats'

export interface WeightRule {
  stat: string | RegExp
  weight: number
  slots?: Slot[]
}

export const DEFAULT_WEIGHTS: WeightRule[] = [
  { stat: DERIVED.totalDps, weight: 1 },
  { stat: DERIVED.criticalHitChance, weight: 2 },
  { stat: DERIVED.armour, weight: 0.05 },
  { stat: DERIVED.evasion, weight: 0.05 },
  { stat: DERIVED.energyShield, weight: 0.4 },
  { stat: DERIVED.spirit, weight: 0.5 },
  { stat: DERIVED.block, weight: 1 },
  { stat: '+# to maximum Life', weight: 1 },
  { stat: '+# to maximum Energy Shield', weight: 0.8 },
  { stat: '+# to maximum Mana', weight: 0.3 },
  { stat: /^\+#% to (Fire|Cold|Lightning) Resistance$/i, weight: 1.5 },
  { stat: '+#% to Chaos Resistance', weight: 1 },
  { stat: /^\+# to (Strength|Dexterity|Intelligence)$/i, weight: 0.4 },
  { stat: '+# to Spirit', weight: 0.5 },
  { stat: '#% increased Movement Speed', weight: 4 },
  { stat: /^\+# to Level of all .+ Skills$/i, weight: 15 },
  { stat: 'Adds # to # Physical Damage to Attacks', weight: 2 },
  { stat: /^Adds # to # (Fire|Cold|Lightning|Chaos) Damage to Attacks$/i, weight: 1.5 },
  { stat: '#% increased Attack Speed', weight: 1.5 },
  { stat: '#% increased Cast Speed', weight: 1.5 },
  { stat: '#% increased Critical Hit Chance', weight: 0.5 },
  { stat: '#% increased Critical Damage Bonus', weight: 0.5 },
  { stat: /^#% increased .*Damage$/i, weight: 0.4 },
  { stat: '+# to Accuracy Rating', weight: 0.02 },
  { stat: /^#% increased (Armour|Evasion Rating|Energy Shield|maximum Energy Shield)$/i, weight: 0.3 },
  { stat: /^\+# to (Armour|Evasion Rating)$/i, weight: 0.05 },
  { stat: /^#% increased (Rarity|Quantity) of Items found$/i, weight: 0.3 },
  { stat: /Life Regeneration/i, weight: 0.3 },
  { stat: /Leeched as (Life|Mana)$/i, weight: 2 },
  { stat: '#% increased Mana Regeneration Rate', weight: 0.2 },
]

export function weightFor(stat: string, slot: Slot | undefined, rules: WeightRule[] = DEFAULT_WEIGHTS): number {
  for (const rule of rules) {
    if (rule.slots && (!slot || !rule.slots.includes(slot))) continue
    const matches =
      typeof rule.stat === 'string' ? rule.stat.toLowerCase() === stat.toLowerCase() : rule.stat.test(stat)
    if (matches) return rule.weight
  }
  return 0
}
