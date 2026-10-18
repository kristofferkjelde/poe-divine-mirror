import { describe, expect, it } from 'vitest'
import { clientLogCandidates, completeLines, steamLibraries } from './clientLog'

describe('client log', () => {
  it('reads Steam library folders', () => {
    const vdf = `"libraryfolders"\n{\n\t"0"\n\t{\n\t\t"path"\t\t"C:\\\\Program Files (x86)\\\\Steam"\n\t}\n\t"1"\n\t{\n\t\t"path"\t\t"D:\\\\SteamLibrary"\n\t}\n}`
    expect(steamLibraries(vdf)).toEqual(['C:\\Program Files (x86)\\Steam', 'D:\\SteamLibrary'])
  })

  it('looks in the standalone and Steam install folders', () => {
    expect(clientLogCandidates(['C:\\Program Files'], ['D:\\SteamLibrary'])).toEqual([
      ['C:\\Program Files', 'Grinding Gear Games', 'Path of Exile 2', 'logs', 'Client.txt'],
      ['D:\\SteamLibrary', 'steamapps', 'common', 'Path of Exile 2', 'logs', 'Client.txt'],
    ])
  })

  it('keeps a half-written line until it is complete', () => {
    const first = completeLines('', 'one\r\ntw')
    expect(first).toEqual({ lines: ['one'], rest: 'tw' })
    expect(completeLines(first.rest, 'o\nthree')).toEqual({ lines: ['two'], rest: 'three' })
  })
})
