import type { Slot } from '../item/types'
import { DERIVED } from './stats'

export type WeightTag = 'attack' | 'spell' | 'minion' | 'armour' | 'evasion' | 'energyShield' | 'life' | 'skillLevel'

export interface WeightRule {
  stat: string | RegExp
  weight: number
  slots?: Slot[]
  tag?: WeightTag
}

export const DEFAULT_WEIGHTS: WeightRule[] = [
  { stat: DERIVED.totalDps, weight: 1, tag: 'attack' },
  { stat: DERIVED.criticalHitChance, weight: 2, tag: 'attack' },
  { stat: DERIVED.armour, weight: 0.05, tag: 'armour' },
  { stat: DERIVED.evasion, weight: 0.05, tag: 'evasion' },
  { stat: DERIVED.energyShield, weight: 0.4, tag: 'energyShield' },
  { stat: DERIVED.spirit, weight: 0.5 },
  { stat: DERIVED.block, weight: 1 },
  { stat: '+# to maximum Life', weight: 1, tag: 'life' },
  { stat: '+# to maximum Energy Shield', weight: 0.8, tag: 'energyShield' },
  { stat: '+# to maximum Mana', weight: 0.3 },
  { stat: /^\+#% to (Fire|Cold|Lightning) Resistance$/i, weight: 1.5 },
  { stat: '+#% to Chaos Resistance', weight: 1 },
  { stat: /^\+# to (Strength|Dexterity|Intelligence)$/i, weight: 0.4 },
  { stat: '+# to Spirit', weight: 0.5 },
  { stat: '#% increased Movement Speed', weight: 4 },
  { stat: /^\+# to Level of all .+ Skills$/i, weight: 15, tag: 'skillLevel' },
  { stat: 'Adds # to # Physical Damage to Attacks', weight: 2, tag: 'attack' },
  { stat: /^Adds # to # (Fire|Cold|Lightning|Chaos) Damage to Attacks$/i, weight: 1.5, tag: 'attack' },
  { stat: '#% increased Attack Speed', weight: 1.5, tag: 'attack' },
  { stat: '+# to Accuracy Rating', weight: 0.02, tag: 'attack' },
  { stat: '#% increased Cast Speed', weight: 1.5, tag: 'spell' },
  { stat: /^#% increased .*Spell.* Damage$|^#% increased Damage with Spells$/i, weight: 0.4, tag: 'spell' },
  { stat: /^#% increased .*Damage with Attacks$|^#% increased Attack Damage$/i, weight: 0.4, tag: 'attack' },
  { stat: /^Minions? /i, weight: 0.3, tag: 'minion' },
  { stat: '#% increased Critical Hit Chance', weight: 0.5 },
  { stat: '#% increased Critical Damage Bonus', weight: 0.5 },
  { stat: /^#% increased .*Damage$/i, weight: 0.4 },
  { stat: /^#% increased Armour$/i, weight: 0.3, tag: 'armour' },
  { stat: /^#% increased Evasion Rating$/i, weight: 0.3, tag: 'evasion' },
  { stat: /^#% increased (maximum )?Energy Shield$/i, weight: 0.3, tag: 'energyShield' },
  { stat: /^#% increased (Armour|Evasion Rating|Energy Shield) and (Armour|Evasion Rating|Energy Shield)$/i, weight: 0.3 },
  { stat: /^\+# to Armour$/i, weight: 0.05, tag: 'armour' },
  { stat: /^\+# to Evasion Rating$/i, weight: 0.05, tag: 'evasion' },
  { stat: /^#% increased (Rarity|Quantity) of Items found$/i, weight: 0.3 },
  { stat: /Life Regeneration/i, weight: 0.3, tag: 'life' },
  { stat: /Leeched as (Life|Mana)$/i, weight: 2 },
  { stat: '#% increased Mana Regeneration Rate', weight: 0.2 },
]

export function matchingRule(stat: string, slot: Slot | undefined, rules: WeightRule[]): WeightRule | undefined {
  return rules.find((rule) => {
    if (rule.slots && (!slot || !rule.slots.includes(slot))) return false
    return typeof rule.stat === 'string' ? rule.stat.toLowerCase() === stat.toLowerCase() : rule.stat.test(stat)
  })
}

export function weightFor(stat: string, slot: Slot | undefined, rules: WeightRule[] = DEFAULT_WEIGHTS): number {
  return matchingRule(stat, slot, rules)?.weight ?? 0
}
