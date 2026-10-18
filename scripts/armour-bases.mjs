import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/dev/src/Data/Bases'
const FILES = ['helmet', 'body', 'gloves', 'boots', 'shield', 'focus']
const DEFENCES = { Armour: 'armour', Evasion: 'evasion', EnergyShield: 'energyShield' }

const bases = {}
for (const file of FILES) {
  const response = await fetch(`${SOURCE}/${file}.lua`)
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`)
  const lua = await response.text()
  for (const [, name, body] of lua.matchAll(/itemBases\["([^"]+)"\] = \{([\s\S]*?)\n\}/g)) {
    const armour = /armour = \{([^}]*)\}/.exec(body)?.[1]
    if (!armour) continue
    const base = {}
    for (const [key, field] of Object.entries(DEFENCES)) {
      const value = Number(new RegExp(`\\b${key} = ([\\d.]+)`).exec(armour)?.[1] ?? 0)
      if (value > 0) base[field] = value
    }
    if (Object.keys(base).length > 0) bases[name] = base
  }
}

const sorted = Object.fromEntries(Object.entries(bases).sort(([a], [b]) => a.localeCompare(b)))
await writeFile(new URL('../src/shared/build/armourBases.json', import.meta.url), `${JSON.stringify(sorted)}\n`)
console.log(`Wrote ${Object.keys(sorted).length} armour bases`)
