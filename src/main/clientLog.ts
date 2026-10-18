import { open, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { characterInLogLine } from '../shared/characters'
import { clientLogCandidates, completeLines, steamLibraries } from '../shared/clientLog'
import type { CharacterStore } from './characterStore'

const POLL_MS = 2000
const SEARCH_EVERY_MS = 60_000
const STARTUP_TAIL_BYTES = 512 * 1024
const MAX_READ_BYTES = 1024 * 1024

async function findClientLog(): Promise<string | undefined> {
  const programFiles = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, 'C:\\Program Files (x86)', 'C:\\Program Files']
    .filter((folder): folder is string => Boolean(folder))
  const steam = programFiles.map((folder) => join(folder, 'Steam'))
  const libraries = await Promise.all(
    steam.map((folder) =>
      readFile(join(folder, 'steamapps', 'libraryfolders.vdf'), 'utf8')
        .then(steamLibraries)
        .catch(() => []),
    ),
  )
  const candidates = clientLogCandidates([...new Set(programFiles)], [...new Set([...steam, ...libraries.flat()])])
  for (const parts of candidates) {
    const path = join(...parts)
    if (await stat(path).then((info) => info.isFile(), () => false)) return path
  }
  return undefined
}

async function readFrom(path: string, start: number, end: number): Promise<string> {
  const file = await open(path, 'r')
  try {
    const length = Math.min(end - start, MAX_READ_BYTES)
    const buffer = Buffer.alloc(length)
    const { bytesRead } = await file.read(buffer, 0, length, end - length)
    return buffer.subarray(0, bytesRead).toString('utf8')
  } finally {
    await file.close()
  }
}

export class ClientLog {
  private path: string | undefined
  private offset = 0
  private rest = ''
  private lastSearch = 0

  constructor(private readonly characters: CharacterStore) {}

  start(): void {
    const tick = () => void this.poll().finally(() => setTimeout(tick, POLL_MS))
    tick()
  }

  private async poll(): Promise<void> {
    if (!this.path) {
      if (Date.now() - this.lastSearch < SEARCH_EVERY_MS) return
      this.lastSearch = Date.now()
      this.path = await findClientLog()
      if (!this.path) return
      const size = await stat(this.path).then((info) => info.size, () => 0)
      this.offset = Math.max(0, size - STARTUP_TAIL_BYTES)
      this.rest = ''
    }

    try {
      const { size } = await stat(this.path)
      if (size < this.offset) this.offset = 0
      if (size === this.offset) return
      const text = await readFrom(this.path, this.offset, size)
      this.offset = size
      const { lines, rest } = completeLines(this.rest, text)
      this.rest = rest
      let found: string | undefined
      for (const line of lines) found = characterInLogLine(line, this.characters.current) ?? found
      if (found) await this.characters.select(found)
    } catch {
      this.path = undefined
    }
  }
}
