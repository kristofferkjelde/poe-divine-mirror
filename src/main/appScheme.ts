import { net, protocol } from 'electron'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export const APP_SCHEME = 'app'
const APP_HOST = 'renderer'
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`

const ROOT = resolve(__dirname, '../renderer')

export function serveApp(): void {
  protocol.handle(APP_SCHEME, (request) => {
    const { host, pathname } = new URL(request.url)
    const file = join(ROOT, decodeURIComponent(pathname))
    if (host !== APP_HOST || !file.startsWith(ROOT + sep)) return new Response(null, { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })
}
