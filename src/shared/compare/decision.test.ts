import { describe, expect, it } from 'vitest'
import { parseItem } from '../item/parse'
import { breakdown, decide, describeChange, shortStat } from './decision'
import { compareWithGear } from './gear'

const sceptre = (name: string, mods: string, spirit = 100) =>
  parseItem(
    `Item Class: Sceptres\nRarity: Rare\n${name}\nShrine Sceptre\n--------\nSpirit: ${spirit}\n--------\nItem Level: 80\n--------\n${mods}`,
  )

const candidate = sceptre('Onslaught Smasher', '+143 to maximum Mana\n+4 to Level of all Minion Skills')
const worse = sceptre('Carrion Call', '+20 to maximum Mana', 156)
const better = sceptre('Maelstrom Knell', '+150 to maximum Mana\n+5 to Level of all Minion Skills', 184)

describe('shortStat', () => {
  it('turns stat templates into short names', () => {
    expect(shortStat('+# to maximum Mana')).toBe('Mana')
    expect(shortStat('+# to Level of all Minion Skills')).toBe('Minion skill levels')
    expect(shortStat('Allies in your Presence deal # to # added Attack Fire Damage')).toBe('ally Fire damage')
    expect(shortStat('#% increased Spirit')).toBe('increased Spirit')
  })
})

describe('breakdown', () => {
  it('lists gains and losses by how much they moved the score, and warns about lost Spirit', () => {
    const result = compareWithGear(candidate, { weapon: worse })!
    const { gains, losses, warnings } = breakdown(result.comparison)
    expect(gains).toEqual(['+4 Minion skill levels', '+123 Mana'])
    expect(losses).toEqual(['−56 Spirit'])
    expect(warnings).toEqual(['56 less Spirit: check your auras and minions still fit'])
    expect(describeChange(result.comparison.rows.find((row) => row.stat === 'Spirit')!)).toBe('−56 Spirit')
  })
})

describe('decide', () => {
  const gear = compareWithGear(candidate, { weapon: worse })
  const build = compareWithGear(candidate, { weapon: better })

  it('says to wear it for now when it beats your gear but not your build', () => {
    expect(decide(gear, build)).toMatchObject({ title: 'Wear it for now', tone: 'good' })
    expect(decide(gear, build)?.detail).toMatch(/your build's Maelstrom Knell, Shrine Sceptre is still the goal \(-?\d/)
  })

  it('handles only one comparison', () => {
    expect(decide(gear, null)).toMatchObject({ title: 'Equip it', tone: 'good' })
    expect(decide(null, build)).toMatchObject({ title: "Build's weapon is better", tone: 'bad' })
    expect(decide(null, { ...build, slot: 'ring2' })?.title).toBe("Build's ring is better")
    expect(decide(null, { ...build, slot: 'boots' })?.title).toBe("Build's boots are better")
    expect(decide(null, null)).toBeNull()
  })

  it('says to skip an item worse than both', () => {
    const weak = sceptre('Weak', '+10 to maximum Mana', 80)
    expect(decide(compareWithGear(weak, { weapon: worse }), compareWithGear(weak, { weapon: better }))).toMatchObject({
      title: 'Skip it',
    })
  })
})
