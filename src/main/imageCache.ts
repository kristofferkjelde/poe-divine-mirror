import { app, protocol } from 'electron'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { IMAGE_SCHEME, remoteImage } from '../shared/imageCache'
import { APP_SCHEME } from './appScheme'
import { get, HttpError } from './http'

export function registerSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: IMAGE_SCHEME, privileges: { standard: true, secure: true } },
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  ])
}

export function serveCachedImages(): void {
  const dir = join(app.getPath('userData'), 'image-cache')
  const downloads = new Map<string, Promise<Buffer>>()

  const download = async (url: string, file: string): Promise<Buffer> => {
    const bytes = Buffer.from(await (await get(url)).arrayBuffer())
    const temp = `${file}.tmp`
    await mkdir(dir, { recursive: true })
    await writeFile(temp, bytes)
    await rename(temp, file)
    return bytes
  }

  protocol.handle(IMAGE_SCHEME, async (request) => {
    const image = remoteImage(request.url)
    if (!image) return new Response(null, { status: 400 })
    const headers = { 'content-type': image.type, 'cache-control': 'max-age=31536000, immutable' }
    const file = join(dir, createHash('sha256').update(image.url).digest('hex'))
    try {
      return new Response(await readFile(file), { headers })
    } catch {}
    let bytes = downloads.get(file)
    if (!bytes) {
      bytes = download(image.url, file).finally(() => downloads.delete(file))
      downloads.set(file, bytes)
    }
    try {
      return new Response(await bytes, { headers })
    } catch (error) {
      return new Response(null, { status: error instanceof HttpError ? error.response.status : 502 })
    }
  })
}
