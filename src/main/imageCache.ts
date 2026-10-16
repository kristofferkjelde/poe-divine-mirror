import { app, net, protocol } from 'electron'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { IMAGE_SCHEME, remoteImage } from '../shared/imageCache'
import { APP_SCHEME } from './appScheme'

export function registerSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: IMAGE_SCHEME, privileges: { standard: true, secure: true } },
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  ])
}

export function serveCachedImages(): void {
  const dir = join(app.getPath('userData'), 'image-cache')
  protocol.handle(IMAGE_SCHEME, async (request) => {
    const image = remoteImage(request.url)
    if (!image) return new Response(null, { status: 400 })
    const headers = { 'content-type': image.type, 'cache-control': 'max-age=31536000, immutable' }
    const file = join(dir, createHash('sha256').update(image.url).digest('hex'))
    try {
      return new Response(await readFile(file), { headers })
    } catch {}
    try {
      const response = await net.fetch(image.url)
      if (!response.ok) return new Response(null, { status: response.status })
      const bytes = Buffer.from(await response.arrayBuffer())
      await mkdir(dir, { recursive: true })
      await writeFile(file, bytes)
      return new Response(bytes, { headers })
    } catch {
      return new Response(null, { status: 502 })
    }
  })
}
