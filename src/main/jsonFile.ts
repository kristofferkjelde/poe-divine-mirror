import { app } from 'electron'
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export function jsonFile(name: string) {
  const path = join(app.getPath('userData'), name)
  return {
    read(): unknown {
      try {
        return JSON.parse(readFileSync(path, 'utf8'))
      } catch {
        return undefined
      }
    },
    write(data: unknown): Promise<void> {
      return writeFile(path, JSON.stringify(data, null, 2))
    },
  }
}
