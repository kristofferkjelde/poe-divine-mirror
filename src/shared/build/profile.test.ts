import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { BuildImportError, decodePobCode, importBuild } from '../../main/buildImport'
import { compareItems } from '../compare/compare'
import { DERIVED } from '../compare/stats'
import { DEFAULT_WEIGHTS, weightFor } from '../compare/weights'
import { parseItem } from '../item/parse'
import { parsePobXml, PobParseError } from './pob'
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
    expect(build.items.map((item) => item.slot)).toEqual(['weapon', 'helmet', 'ring', 'boots'])
    const weapon = build.items[0]
    expect(weapon.mods.map((mod) => mod.text)).toContain('Adds 22 to 37 Physical Damage')
    expect(weapon.mods[0].type).toBe('rune')
    expect(build.items[3].mods.map((mod) => mod.text)).toEqual(['+20 to Dexterity', '+5 to maximum Mana', '20% increased Movement Speed'])
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
    expect(weightFor('+# to Level of all Melee Skills', 'amulet', rules)).toBe(15)
    expect(weightFor('+# to Level of all Spell Skills', 'amulet', rules)).toBe(1)
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
