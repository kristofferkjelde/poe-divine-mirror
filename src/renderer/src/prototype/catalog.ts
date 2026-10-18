const art = import.meta.glob('./art/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const img = (file: string) => art[`./art/${file}.webp`]

export type Group = 'Orbs' | 'Runes' | 'Omens' | 'Essences' | 'Fragments' | 'Gems'

export const GROUPS: Group[] = ['Orbs', 'Runes', 'Omens', 'Essences', 'Fragments', 'Gems']

export interface Currency {
  id: string
  name: string
  short: string
  art: string
  group: Group
  inExalted: number
}

const c = (id: string, name: string, short: string, file: string, group: Group, inExalted: number): Currency => ({
  id,
  name,
  short,
  art: img(file),
  group,
  inExalted,
})

export const CATALOG: Currency[] = [
  c('chaos', 'Chaos Orb', 'Chaos', 'CurrencyRerollRare', 'Orbs', 4.8),
  c('exalted', 'Exalted Orb', 'Exalted', 'CurrencyAddModToRare', 'Orbs', 1),
  c('divine', 'Divine Orb', 'Divine', 'CurrencyModValues', 'Orbs', 412),
  c('annul', 'Orb of Annulment', 'Annul', 'AnnullOrb', 'Orbs', 9),
  c('regal', 'Regal Orb', 'Regal', 'CurrencyUpgradeMagicToRare', 'Orbs', 0.6),
  c('alch', 'Orb of Alchemy', 'Alchemy', 'CurrencyUpgradeToRare', 'Orbs', 0.3),
  c('vaal', 'Vaal Orb', 'Vaal', 'CurrencyVaal', 'Orbs', 1.2),
  c('chance', 'Orb of Chance', 'Chance', 'CurrencyUpgradeToUnique', 'Orbs', 0.8),
  c('transmute', 'Orb of Transmutation', 'Transmute', 'CurrencyUpgradeToMagic', 'Orbs', 0.05),
  c('aug', 'Orb of Augmentation', 'Augment', 'CurrencyAddModToMagic', 'Orbs', 0.1),
  c('artificers', "Artificer's Orb", 'Artificer', 'CurrencyAddEquipmentSocket', 'Orbs', 0.4),
  c('gcp', "Gemcutter's Prism", 'Gemcutter', 'CurrencyGemQuality', 'Orbs', 2.5),
  c('bauble', "Glassblower's Bauble", 'Bauble', 'CurrencyFlaskQuality', 'Orbs', 0.4),
  c('fracturing-orb', 'Fracturing Orb', 'Fracturing', 'FracturingOrb', 'Orbs', 160),
  c('hinekoras-lock', "Hinekora's Lock", 'Hinekora', 'HinekorasLock', 'Orbs', 3800),
  c('mirror', 'Mirror of Kalandra', 'Mirror', 'CurrencyDuplicate', 'Orbs', 52000),
  c('iron-rune', 'Iron Rune', 'Iron', 'EnhanceRune', 'Runes', 0.2),
  c('greater-iron-rune', 'Greater Iron Rune', 'Gr. Iron', 'EnhanceRuneTier2', 'Runes', 4),
  c('desert-rune', 'Desert Rune', 'Desert', 'FireRune', 'Runes', 0.3),
  c('glacial-rune', 'Glacial Rune', 'Glacial', 'ColdRune', 'Runes', 0.3),
  c('storm-rune', 'Storm Rune', 'Storm', 'LightningRune', 'Runes', 0.3),
  c('soul-core-of-tacati', 'Soul Core of Tacati', 'Tacati', 'GreaterSoulCoreChaos', 'Runes', 30),
  c('omen-of-whittling', 'Omen of Whittling', 'Whittling', 'VoodooOmens1Dark', 'Omens', 140),
  c('omen-of-light', 'Omen of Light', 'Light', 'OmenOnAnnulRemoveAbyssMod', 'Omens', 85),
  c('omen-of-corruption', 'Omen of Corruption', 'Corruption', 'VoodooOmens3Red', 'Omens', 25),
  c('essence-of-the-body', 'Essence of the Body', 'Body', 'LifeEssence', 'Essences', 2),
  c('greater-essence-of-electricity', 'Greater Essence of Electricity', 'Gr. Electricity', 'GreaterLightningEssence', 'Essences', 1.5),
  c('greater-essence-of-ruin', 'Greater Essence of Ruin', 'Gr. Ruin', 'GreaterChaosEssence', 'Essences', 18),
  c('breach-splinter', 'Breach Splinter', 'Breach', 'BreachstoneSplinter', 'Fragments', 0.6),
  c('simulacrum-splinter', 'Simulacrum Splinter', 'Simulacrum', 'DeliriumSplinter', 'Fragments', 1.8),
  c('uncut-skill-gem-20', 'Uncut Skill Gem (Level 20)', 'Skill 20', 'UncutSkillGem', 'Gems', 410),
  c('uncut-support-gem-3', 'Uncut Support Gem (Level 3)', 'Support 3', 'UncutSupportGem', 'Gems', 6),
  c('uncut-spirit-gem-20', 'Uncut Spirit Gem (Level 20)', 'Spirit 20', 'UncutSkillGemBuff', 'Gems', 160),
]

export const byId = (id: string) => CATALOG.find((currency) => currency.id === id)!

export interface Hovered {
  currency: Currency
  name: string
  detail: string
  rarity: 'currency' | 'gem' | 'normal'
  stack?: number
  maxStack?: number
}

const waystone: Currency = { id: 'waystone-15', name: 'Waystone (Tier 15)', short: 'Waystone 15', art: img('EndgameMap15'), group: 'Fragments', inExalted: 9 }

export const HOVERED: Record<string, Hovered> = {
  divine: { currency: byId('divine'), name: 'Divine Orb', detail: 'Stack 7 / 20', rarity: 'currency', stack: 7, maxStack: 20 },
  gem: { currency: byId('uncut-skill-gem-20'), name: 'Uncut Skill Gem', detail: 'Level 20', rarity: 'gem' },
  rune: { currency: byId('greater-iron-rune'), name: 'Greater Iron Rune', detail: 'Stack 3 / 10', rarity: 'currency', stack: 3, maxStack: 10 },
  omen: { currency: byId('omen-of-light'), name: 'Omen of Light', detail: 'Stack 1 / 10', rarity: 'currency', stack: 1, maxStack: 10 },
  essence: { currency: byId('greater-essence-of-ruin'), name: 'Greater Essence of Ruin', detail: 'Stack 4 / 10', rarity: 'currency', stack: 4, maxStack: 10 },
  waystone: { currency: waystone, name: 'Waystone (Tier 15)', detail: 'Tier 15', rarity: 'normal' },
}

export const LEAGUE = 'Rise of the Abyssal'

export interface Rate {
  value: number
  low: number
  high: number
  offers: number
  reliability: number
}

export function rate(item: Currency, target: Currency): Rate {
  const value = item.inExalted / target.inExalted
  const offers = Math.max(3, Math.round(60 / (1 + Math.abs(Math.log10(value)))))
  return { value, low: value * 0.96, high: value * 1.06, offers, reliability: offers > 40 ? 4 : offers > 20 ? 3 : offers > 8 ? 2 : 1 }
}

export function formatAmount(value: number): string {
  if (value >= 100) return Math.round(value).toLocaleString('en-US')
  if (value >= 10) return String(Math.round(value * 10) / 10)
  if (value >= 1) return String(Math.round(value * 100) / 100)
  return String(Number(value.toPrecision(2)))
}

export const DEFAULT_PINS = ['chaos', 'exalted', 'divine']
