import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { addStages, BuildImportError, chooseItemSet, importBuild, refreshProfile, stagesFromFiles } from '../../main/buildImport'
import { mobalyticsStages } from './mobalytics'
import { parsePlannerBuild, PlannerParseError, type PlannerStage } from './planner'
import { isStoredProfile } from './profile'

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')
const code = fixture('navira.pob')
const state = fixture('mobalytics-navira-state.json')
const early = parsePlannerBuild(fixture('navira-early-endgame.build'), 'Early Endgame.build')
const uber = parsePlannerBuild(fixture('navira-uber-endgame.build'), 'Uber Endgame.build')
const files = (...stages: PlannerStage[]) => ({ stages: stages.map((stage) => ({ file: `${stage.title}.build`, ...stage })), failed: [] })
const offline = () => Promise.reject(new Error('offline'))

const EARLY = '74dc2930-4344-402d-a0a9-f0eaba5d0bf2'
const URL_BASE = 'https://mobalytics.gg/poe-2/builds/naviras-fracturing-varashta-league-starter'
const names = (profile: { items: Record<string, { name: string } | undefined> }) =>
  Object.fromEntries(Object.entries(profile.items).map(([slot, item]) => [slot, item?.name]))

describe('.build files', () => {
  it('reads a stage title and its equipped gear, skipping flasks, charms and weapon swap', () => {
    expect(early.title).toBe('Early Endgame')
    expect(Object.keys(early.gear).sort()).toEqual(
      ['amulet', 'belt', 'body', 'boots', 'gloves', 'helmet', 'offhand', 'ring1', 'ring2', 'weapon'].sort(),
    )
    expect(early.gear.helmet).toBe(
      'Rarity: RARE\nRuneforged Sandsworn Tiara\nRuneforged Sandsworn Tiara\nImplicits: 0\n+120 to maximum Life\n+31 to Intelligence\n+26% to Cold Resistance\n+52 to maximum Energy Shield\n43% increased Energy Shield\n+2 to Level of all Minion Skills',
    )
    expect(uber.gear.ring2).toBe('Rarity: UNIQUE\nEvergrasping Ring\nImplicits: 0')
  })

  it('reads every .build file in the zip Mobalytics downloads', () => {
    const zip = new Uint8Array(readFileSync(new URL('./__fixtures__/navira-stages.zip', import.meta.url)))
    const { stages, failed } = stagesFromFiles([{ name: 'navira.zip', data: zip }])
    expect(stages.map(({ title }) => title)).toEqual(['Early Endgame', 'Uber Endgame'])
    expect(stages[0]).toEqual({ file: expect.stringMatching(/\.build$/), ...early })
    expect(failed).toEqual([])
    const single = stagesFromFiles([{ name: 'early.build', data: new TextEncoder().encode(fixture('navira-early-endgame.build')) }])
    expect(single.stages).toEqual([{ file: 'early.build', ...early }])
  })

  it('reports each file that could not be read and keeps the rest', () => {
    const zip = new Uint8Array(readFileSync(new URL('./__fixtures__/navira-stages.zip', import.meta.url)))
    const { stages, failed } = stagesFromFiles([
      { name: 'broken.zip', data: zip.subarray(0, 100) },
      { name: 'notes.build', data: new TextEncoder().encode('{"name":"x"}') },
      { name: 'early.build', data: new TextEncoder().encode(fixture('navira-early-endgame.build')) },
    ])
    expect(stages.map(({ file }) => file)).toEqual(['early.build'])
    expect(failed).toEqual([
      { file: 'broken.zip', error: expect.stringMatching(/not a zip file/) },
      { file: 'notes.build', error: expect.stringMatching(/not a .build file/) },
    ])
  })

  it('rejects files that are not .build files', () => {
    expect(() => parsePlannerBuild('nope', 'notes.txt')).toThrow(PlannerParseError)
    expect(() => parsePlannerBuild('{"name":"x"}', 'x.build')).toThrow(/not a .build file/)
  })
})

describe('stage gear', () => {
  it('gives empty Path of Building stages the gear from their .build files', async () => {
    const imported = await importBuild(code, offline)
    const before = chooseItemSet(imported, '6')
    expect(before.items.helmet?.baseType).toBe('Iron Crown')
    expect(before.borrowed?.helmet).toBe('Act 4 to Endgame')

    const { profile: staged, report } = addStages({ ...imported, custom: { '+# to maximum Life': 2 } }, files(early, uber))
    expect(report).toEqual([
      { file: 'Early Endgame.build', stage: 'Early Endgame', items: 10 },
      { file: 'Uber Endgame.build', stage: 'Uber Endgame', items: expect.any(Number) },
    ])
    expect(staged.itemSet).toBe(imported.itemSet)
    expect(staged.custom).toEqual({ '+# to maximum Life': 2 })

    const earlyStage = chooseItemSet(staged, '6')
    expect(names(earlyStage)).toMatchObject({
      weapon: 'Shrine Sceptre',
      offhand: 'Arrayed Focus',
      helmet: 'Runeforged Sandsworn Tiara',
      ring1: 'Emerald Ring',
      ring2: 'Ruby Ring',
    })
    expect(earlyStage.borrowed).toEqual({})
    expect(earlyStage.items.boots?.mods.map(({ text }) => text)).toContain('20% increased Movement Speed')

    const uberStage = chooseItemSet(staged, '7')
    expect(uberStage.items.ring2).toMatchObject({ name: 'Evergrasping Ring', rarity: 'Unique' })
    expect(uberStage.items.ring2?.mods.length).toBeGreaterThan(0)
    expect(staged.itemSets?.find(({ id }) => id === '1')?.sameAs).toBe('Early Endgame')
  })

  it('keeps the stage gear when a build is re-read by a newer version', async () => {
    const { profile: staged } = addStages(await importBuild(code, offline), files(early))
    const refreshed = refreshProfile({ ...chooseItemSet(staged, '6'), version: 1 })
    expect(refreshed.items.helmet?.name).toBe('Runeforged Sandsworn Tiara')
    expect(isStoredProfile(refreshed)).toBe(true)
    expect(isStoredProfile({ ...refreshed, stageGear: { 6: { helmet: 3 } } })).toBe(false)
  })

  it('says which files do not match a stage and still adds the others', async () => {
    const imported = await importBuild(code, offline)
    const other = { title: 'Campaign Speedrun', gear: {} }
    const { profile, report } = addStages(imported, files(early, other))
    expect(report[0]).toEqual({ file: 'Early Endgame.build', stage: 'Early Endgame', items: 10 })
    expect(report[1]).toEqual({ file: 'Campaign Speedrun.build', error: expect.stringMatching(/"Campaign Speedrun" is not a gear stage.*Early Endgame/) })
    expect(Object.keys(profile.stageGear ?? {})).toEqual(['6'])
    expect(() => addStages(null, files(early))).toThrow(BuildImportError)
  })
})

describe('Mobalytics pages', () => {
  it("reads each variant's equipment", () => {
    const stages = mobalyticsStages(JSON.parse(state))
    expect(stages.map(({ title }) => title)).toEqual(['Early Endgame', 'Late Endgame'])
    expect(stages[0].gear.weapon?.split('\n').slice(0, 5)).toEqual([
      'Rarity: RARE',
      'Shrine Sceptre',
      'Shrine Sceptre',
      'Implicits: 0',
      '+29 to maximum Mana',
    ])
    expect(stages[1].gear).toEqual({ ring1: 'Rarity: UNIQUE\nEvergrasping Ring\nImplicits: 0' })
  })

  it('imports a link with the gear of every stage and opens the linked one', async () => {
    const url = `${URL_BASE}?ws-ngf5-f7d82102=activeVariantId%2C${EARLY}`
    const profile = await importBuild(url, offline, async () => state)
    expect(profile.itemSet).toBe('6')
    expect(profile.items.helmet?.name).toBe('Runeforged Sandsworn Tiara')
    expect(profile.borrowed).toEqual({})
    expect(Object.keys(profile.stageGear ?? {}).sort()).toEqual(['6', '8'])
  })

  it('falls back to a plain download when the page cannot be opened', async () => {
    const page = `<html><script>{"pobCode":"${code}"}</script></html>`
    const profile = await importBuild(URL_BASE, async () => page, offline)
    expect(profile.itemSets?.length).toBe(8)
  })
})
