import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/dev/src/Data/Bases'
const FILES = ['axe', 'bow', 'claw', 'crossbow', 'dagger', 'flail', 'mace', 'sceptre', 'spear', 'staff', 'sword', 'talisman', 'wand']
const DAMAGE = ['Physical', 'Fire', 'Cold', 'Lightning', 'Chaos']

const bases = {}
for (const file of FILES) {
  const response = await fetch(`${SOURCE}/${file}.lua`)
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`)
  const lua = await response.text()
  for (const [, name, body] of lua.matchAll(/itemBases\["([^"]+)"\] = \{([\s\S]*?)\n\}/g)) {
    const weapon = /weapon = \{([^}]*)\}/.exec(body)?.[1]
    if (!weapon) continue
    const field = (key) => Number(new RegExp(`\\b${key} = ([\\d.]+)`).exec(weapon)?.[1] ?? 0)
    const damage = Object.fromEntries(
      DAMAGE.filter((type) => field(`${type}Max`) > 0).map((type) => [type, [field(`${type}Min`), field(`${type}Max`)]]),
    )
    bases[name] = { damage, crit: field('CritChanceBase'), aps: field('AttackRateBase') }
  }
}

const sorted = Object.fromEntries(Object.entries(bases).sort(([a], [b]) => a.localeCompare(b)))
await writeFile(new URL('../src/shared/build/weaponBases.json', import.meta.url), `${JSON.stringify(sorted)}\n`)
console.log(`Wrote ${Object.keys(sorted).length} weapon bases`)
