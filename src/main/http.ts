import { app, net } from 'electron'

const TIMEOUT_MS = 15_000

export interface RequestOptions {
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  cache?: 'default' | 'no-store'
}

export class HttpError extends Error {
  constructor(
    url: string,
    readonly response: Response,
  ) {
    super(`HTTP ${response.status}: ${url}`)
  }
}

export const apiHeaders = (): Record<string, string> => ({
  Accept: 'application/json',
  'User-Agent': `DivineMirror/${app.getVersion()} (+https://www.poe-divine-mirror.com)`,
})

export function send(url: string, options: RequestOptions = {}): Promise<Response> {
  return net.fetch(url, {
    ...options,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

export async function get(url: string, options: RequestOptions = {}): Promise<Response> {
  const response = await send(url, options)
  if (!response.ok) throw new HttpError(url, response)
  return response
}

export const getText = (url: string): Promise<string> => get(url).then((response) => response.text())
