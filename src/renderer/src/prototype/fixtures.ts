import { parseItem } from '../../../shared/item/parse'
import type { Listing, PriceCheckResult } from '../../../shared/trade/price'
import type { ItemSearch } from '../../../shared/trade/query'

export const ITEM = {
  ...parseItem(`Item Class: Rings
Rarity: Magic
Dancer's Iron Ring of the Flatworm
--------
Requires: Level 8
--------
Item Level: 22
--------
{ Implicit Modifier }
Adds 1(1-2) to 4(3-5) Physical Damage to Attacks (implicit)
--------
{ Prefix Modifier "Dancer's" (Tier: 8) — Defences, Evasion }
+24(21-32) to Evasion Rating
{ Suffix Modifier "of the Flatworm" (Tier: 5) — Life }
3.3(2.1-4) Life Regeneration per second`),
  baseType: 'Iron Ring',
}

export const SEARCH: ItemSearch = {
  type: 'Iron Ring',
  rarity: 'magic',
  corrupted: 'any',
  status: 'securable',
  listed: 'any',
  currency: 'any',
  scale: 0,
  filters: [
    { key: 'ilvl', label: 'Item Level', kind: 'property', enabled: false, value: 22, min: 22, max: null, target: { group: 'type_filters', filter: 'ilvl' } },
    { key: 'mod-0', label: 'Adds 1 to 4 Physical Damage to Attacks', kind: 'mod', enabled: false, value: 2.5, min: 2.5, max: null, statId: 'implicit.a', modType: 'implicit' },
    { key: 'mod-1', label: '+24 to Evasion Rating', kind: 'mod', enabled: true, value: 24, min: 24, max: null, statId: 'explicit.b', modType: 'explicit', affix: 'prefix', tier: 8 },
    { key: 'mod-2', label: '3.3 Life Regeneration per second', kind: 'mod', enabled: true, value: 3.3, min: 3.3, max: null, statId: 'explicit.c', modType: 'explicit', affix: 'suffix', tier: 5 },
  ],
}

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()
const listing = (amount: number, currency: string, itemLevel: number, account: string, hours: number): Listing => ({
  amount,
  currency,
  itemLevel,
  quality: 0,
  account,
  indexed: ago(hours),
  item: { ...ITEM, name: "Dancer's Iron Ring of the Flatworm", itemLevel },
})

export const RESULT: Extract<PriceCheckResult, { ok: true }> = {
  ok: true,
  league: 'Forbidden Rites',
  url: 'https://www.pathofexile.com/trade2/search/poe2/Forbidden%20Rites/prototype',
  total: 1310,
  listings: [
    listing(1, 'regal', 81, 'volk2211#6826', 7 * 24),
    listing(1, 'alch', 83, 'FitSpire#9879', 6 * 24),
    listing(1, 'exalted', 80, 'xiaofukuzi#7437', 36 * 24),
    listing(1, 'exalted', 70, 'affable-kin25#7147', 31 * 24),
    listing(1, 'exalted', 81, 'Drealike#7974', 21 * 24),
    listing(1, 'exalted', 74, 'ThePantySoaker#3500', 34 * 24),
    listing(1, 'exalted', 65, 'heisheng#5022', 41 * 24),
    listing(1, 'exalted', 81, 'Kresslac#0699', 6 * 24),
    listing(2, 'exalted', 79, 'arladin64#1874', 15 * 24),
    listing(3, 'exalted', 77, 'Marduk_#0306', 16),
    listing(5, 'exalted', 74, 'Zukara#6827', 15),
    listing(8, 'exalted', 72, 'SonyAD#2957', 21 * 24),
  ],
}

export const EXALTED_RATE: Record<string, number> = { alch: 0.3, regal: 0.4, exalted: 1, chaos: 8, divine: 160 }
export const toExalted = ({ amount, currency }: { amount: number; currency: string }) => amount * (EXALTED_RATE[currency] ?? 1)
