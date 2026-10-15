import { app } from 'electron'
import { readFileSync } from 'node:fs'
import { rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export function jsonFile(name: string) {
  const path = join(app.getPath('userData'), name)
  const temp = `${path}.tmp`
  let queue: Promise<void> = Promise.resolve()
  return {
    read(): unknown {
      try {
        return JSON.parse(readFileSync(path, 'utf8'))
      } catch {
        return undefined
      }
    },
    write(data: unknown): Promise<void> {
      const json = JSON.stringify(data, null, 2)
      const written = queue.then(async () => {
        await writeFile(temp, json)
        await rename(temp, path)
      })
      queue = written.catch(() => {})
      return written
    },
  }
}
