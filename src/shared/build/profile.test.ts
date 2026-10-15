import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { BuildImportError, decodePobCode, importBuild, refreshProfile } from '../../main/buildImport'
import { compareItems } from '../compare/compare'
import { compareWithGear } from '../compare/gear'
import { DERIVED, extractStats } from '../compare/stats'
import { DEFAULT_WEIGHTS, weightFor } from '../compare/weights'
import { parseItem } from '../item/parse'
import { parsePobItem, parsePobXml, PobParseError } from './pob'
import { profileFromPob, profileWeights, rulesForProfile, type BuildProfile } from './profile'

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')
const xml = fixture('twister-spirit-walker.xml')
const encode = (text: string) => deflateSync(Buffer.from(text)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')

describe('parsePobXml', () => {
  const build = parsePobXml(xml)

  it('reads the class, main skill and player stats', () => {
    expect(build.ascendancy).toBe('Spirit Walker')
    expect(build.className).toBe('Huntress')
    expect(build.level).toBe(92)
    expect(build.mainSkill).toBe('Twister')
    expect(build.stats.Evasion).toBe(9120)
    expect(build.minion).toBe(false)
  })

  it('reads only equipped gear and resolves ranges, variants and runes', () => {
    expect(build.items.map((entry) => entry.gearSlot)).toEqual(['weapon', 'helmet', 'ring1', 'boots'])
    const weapon = build.items[0].item
    expect(weapon.mods.map((mod) => mod.text)).toContain('Adds 22 to 37 Physical Damage')
    expect(weapon.mods[0].type).toBe('rune')
    expect(weapon.mods.some((mod) => mod.text.includes('<') || mod.text.startsWith('Grants Skill'))).toBe(false)
    expect(build.items[3].item.mods.map((mod) => mod.text)).toEqual([
      '+20 to Dexterity',
      '+5 to maximum Mana',
      '20% increased Movement Speed',
    ])
  })

  it('works out weapon damage from the base type and local mods', () => {
    const weapon = build.items[0].item
    expect(weapon.baseType).toBe('Hunting Spear')
    expect(Object.fromEntries(weapon.properties.map(({ name, value }) => [name, value]))).toEqual({
      'Physical Damage': '51-86',
      'Elemental Damage': '8-105',
      'Critical Hit Chance': '5%',
      'Attacks per Second': '1.77',
    })
    const stats = extractStats(weapon)
    expect(stats.get(DERIVED.physicalDps)?.value).toBeCloseTo(121.2, 0)
    expect(stats.get(DERIVED.totalDps)?.value).toBeCloseTo(221.2, 0)
  })

  it('applies modifier magnitudes to the mods they boost', () => {
    const spear = parsePobItem(
      [
        'Rarity: RARE',
        'Doom Skewer',
        'Soaring Spear',
        'Quality: 20',
        'Implicits: 1',
        'Grants Skill: Spear Throw',
        '{tags:attack}+(327-427) to Accuracy Rating',
        '{tags:attack,speed}{range:0.5}(5-8)% increased Attack Speed',
        '{range:0.5}(25-30)% increased Explicit Speed Modifier magnitudes',
        '{range:0.5}(26-28)% increased Attack Speed',
        '(20-30)% increased effect of Socketed Augment Items',
      ].join('\n'),
      'weapon',
    )
    expect(spear.mods.map((mod) => mod.text)).toEqual([
      '+377 to Accuracy Rating',
      '9% increased Attack Speed',
      '28% increased Explicit Speed Modifier magnitudes',
      '35% increased Attack Speed',
      '25% increased effect of Socketed Augment Items',
    ])
    expect(spear.properties.find((property) => property.name === 'Attacks per Second')?.value).toBe('2.45')
  })

  it('keeps armour values from the build', () => {
    const helmet = build.items[1].item
    expect(helmet.properties).toEqual([{ name: 'Evasion Rating', value: '412', augmented: false }])
    expect(helmet.rarity).toBe('Rare')
    expect(helmet.baseType).toBe('Elite Helm')
  })

  it('rejects PoE 1 builds', () => {
    expect(() => parsePobXml('<PathOfBuilding><Build level="1"/></PathOfBuilding>')).toThrow(PobParseError)
  })
})

describe('profileFromPob', () => {
  const profile = profileFromPob(parsePobXml(xml), 'test')

  it('detects an evasion attack build', () => {
    expect(profile.name).toBe('Spirit Walker · Twister')
    expect(profile.focus).toEqual({ attack: true, spell: false, minion: false })
    expect(profile.defences).toEqual(['evasion'])
    expect(profile.lowLife).toBe(false)
  })

  it('remembers the stats the build gear rolls', () => {
    expect(profile.gearStats).toEqual(
      expect.arrayContaining([
        DERIVED.totalDps,
        'Adds # to # Cold Damage to Attacks',
        '+# to Level of all Melee Skills',
        '+#% to Cold Resistance',
        '#% increased Movement Speed',
      ]),
    )
    expect(profile.gearStats).not.toContain('Adds # to # Physical Damage')
  })

  it('weights stats for the build', () => {
    const rules = rulesForProfile(profile)
    expect(weightFor('Adds # to # Cold Damage to Attacks', 'ring', rules)).toBe(2.25)
    expect(weightFor('#% increased Cast Speed', 'ring', rules)).toBe(0)
    expect(weightFor(DERIVED.energyShield, 'helmet', rules)).toBeCloseTo(0.06)
    expect(weightFor(DERIVED.evasion, 'helmet', rules)).toBeCloseTo(0.075)
    expect(weightFor('+# to Level of all Melee Skills', 'amulet', rules)).toBe(22.5)
    expect(weightFor('+# to Level of all Spell Skills', 'amulet', rules)).toBe(0)
    expect(weightFor('+# to Level of all Projectile Skills', 'amulet', rules)).toBe(15)
  })

  it('lets the player override a weight', () => {
    const custom: BuildProfile = { ...profile, custom: { '#% increased Movement Speed': 10 } }
    expect(weightFor('#% increased Movement Speed', 'boots', rulesForProfile(custom))).toBe(10)
    expect(profileWeights(custom).find((entry) => entry.stat === '#% increased Movement Speed')).toMatchObject({
      weight: 10,
      custom: true,
      fromBuild: true,
    })
  })

  it("compares an item against the build's item for that slot", () => {
    const ring = parseItem(
      'Item Class: Rings\nRarity: Rare\nStorm Loop\nIron Ring\n--------\nItem Level: 70\n--------\n+90 to maximum Life\n+35% to Fire Resistance\nAdds 9 to 16 Physical Damage to Attacks\nAdds 7 to 12 Cold Damage to Attacks',
    )
    const result = compareWithGear(ring, profile.items, rulesForProfile(profile))
    expect(result?.slot).toBe('ring1')
    expect(result?.equipped.name).toBe('Doom Coil')
    expect(result?.comparison.verdict).toBe('upgrade')
  })

  it('falls back to the default weights without a build', () => {
    expect(rulesForProfile(null)).toBe(DEFAULT_WEIGHTS)
  })

  it('scores a spell helmet down for an attack build', () => {
    const helmet = (mods: string) =>
      parseItem(`Item Class: Helmets\nRarity: Rare\nTest Crown\nElite Helm\n--------\nItem Level: 80\n--------\n${mods}`)
    const attack = helmet('+40 to maximum Life\n10% increased Attack Speed')
    const spell = helmet('+40 to maximum Life\n10% increased Cast Speed')
    expect(compareItems(spell, attack).verdict).toBe('sidegrade')
    expect(compareItems(spell, attack, rulesForProfile(profile)).verdict).toBe('downgrade')
  })
})

describe('importBuild', () => {
  const code = encode(xml)
  const offline = () => Promise.reject(new Error('offline'))

  it('imports a pasted code', async () => {
    expect(decodePobCode(code)).toBe(xml)
    expect((await importBuild(`  ${code}\n`, offline)).name).toBe('Spirit Walker · Twister')
  })

  it('re-reads a build saved by an older version, keeping custom weights', async () => {
    const current = await importBuild(code, offline)
    const old = { ...current, version: 1, gearStats: [], items: {}, custom: { '+# to maximum Life': 3 } }
    const refreshed = refreshProfile(old)
    expect(refreshed.version).toBe(current.version)
    expect(refreshed.items.weapon?.name).toBe('Storm Impaler')
    expect(refreshed.custom).toEqual({ '+# to maximum Life': 3 })
    const withoutCode = { ...old, code: undefined }
    expect(refreshProfile(withoutCode)).toBe(withoutCode)
  })

  it('downloads pobb.in and poe.ninja links', async () => {
    const urls: string[] = []
    const fetcher = async (url: string) => (urls.push(url), code)
    await importBuild('https://pobb.in/AbC123', fetcher)
    await importBuild('https://poe.ninja/poe2/pob/1a2b', fetcher)
    expect(urls).toEqual(['https://pobb.in/pob/AbC123', 'https://poe.ninja/poe2/pob/raw/1a2b'])
  })

  it('finds a code embedded in a Mobalytics page', async () => {
    const page = `<html><script>{"pobCode":"${code}"}</script></html>`
    const profile = await importBuild('https://mobalytics.gg/poe-2/builds/twister', async () => page)
    expect(profile.source).toBe('https://mobalytics.gg/poe-2/builds/twister')
  })

  it('explains what to do when Mobalytics has no code', async () => {
    await expect(importBuild('https://mobalytics.gg/poe-2/builds/x', async () => '<html></html>')).rejects.toThrow(/Copy Code/)
  })

  it('rejects junk and unsupported sites', async () => {
    await expect(importBuild('hello there', offline)).rejects.toThrow(BuildImportError)
    await expect(importBuild('abc', offline)).rejects.toThrow(/incomplete/)
    await expect(importBuild('https://example.com/build', offline)).rejects.toThrow(/not supported/)
    await expect(importBuild('https://pobb.in/abc', offline)).rejects.toThrow(/pobb.in/)
  })
})
