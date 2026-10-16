import { PROFILE_VERSION, type BuildProfile } from '../../../shared/build/profile'
import { DERIVED } from '../../../shared/compare/stats'
import { parseItem } from '../../../shared/item/parse'

export const CANDIDATE = `Item Class: Sceptres
Rarity: Rare
Onslaught Smasher
Shrine Sceptre
--------
Quality: +7% (augmented)
Spirit: 100
--------
Requires: Level 62, 17 Str, 38 Int
--------
Item Level: 80
--------
Grants Skill: Level 18 Purity of Fire
--------
+143 to maximum Mana (fractured)
Allies in your Presence deal 1 to 10 added Attack Lightning Damage
Allies in your Presence deal 20 to 37 added Attack Fire Damage
+4 to Level of all Minion Skills
Allies in your Presence have 9% increased Attack Speed
+5 maximum stacks of Puppet Master
--------
Fractured Item`

export const EQUIPPED = `Item Class: Sceptres
Rarity: Rare
Carrion Call
Rattling Sceptre
--------
Spirit: 156 (augmented)
--------
Requires: Level 58, 15 Str, 34 Int
--------
Item Level: 78
--------
Grants Skill: Level 17 Skeletal Warrior
--------
+2 to Level of all Minion Skills
56% increased Spirit
+17 to Intelligence
Allies in your Presence have 8% increased Attack Speed
Allies in your Presence deal 96% increased Damage
Allies in your Presence deal 2 to 5 added Attack Physical Damage`

const BUILD_WEAPON = `Item Class: Sceptres
Rarity: Rare
Maelstrom Knell
Shrine Sceptre
--------
Spirit: 184 (augmented)
--------
Item Level: 82
--------
84% increased Spirit
60% increased Mana Regeneration Rate
Minions deal 40% increased Damage with Command Skills
+114 to maximum Mana
Allies in your Presence have 18% increased Cast Speed`

export const BUILD: BuildProfile = {
  version: PROFILE_VERSION,
  name: 'Disciple of Varashta · Kelari, the Tainted Sands',
  source: 'prototype',
  importedAt: 0,
  focus: { attack: false, spell: true, minion: true },
  defences: ['energyShield'],
  lowLife: false,
  gearStats: [DERIVED.spirit, '#% increased Spirit', '+# to maximum Mana', '+# to Level of all Minion Skills'],
  items: { weapon: parseItem(BUILD_WEAPON) },
  custom: {},
}
