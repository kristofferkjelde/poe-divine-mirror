import { inflateSync } from 'node:zlib'
import { parsePobXml, type ItemSet } from '../shared/build/pob'
import { hasItems, PROFILE_VERSION, profileFromPob, type BuildProfile, type StoredProfile } from '../shared/build/profile'
import { UserFacingError } from '../shared/errors'

export type Fetcher = (url: string) => Promise<string>

const MAX_CODE_LENGTH = 2_000_000
const MAX_XML_BYTES = 20_000_000

const PASTE_SITES: Array<{ pattern: RegExp; raw: (id: string) => string }> = [
  { pattern: /^https?:\/\/pobb\.in\/([\w-]+)\/?$/, raw: (id) => `https://pobb.in/pob/${id}` },
  { pattern: /^https?:\/\/maxroll\.gg\/poe2\/pob\/([\w-]+)\/?$/, raw: (id) => `https://maxroll.gg/poe2/api/pob/${id}` },
  { pattern: /^https?:\/\/poe2?\.ninja\/(?:poe2\/)?pob\/([\w-]+)\/?$/, raw: (id) => `https://poe.ninja/poe2/pob/raw/${id}` },
  { pattern: /^https?:\/\/poe2db\.tw\/pob\/([\w-]+)\/?$/, raw: (id) => `https://poe2db.tw/pob/${id}/raw` },
  { pattern: /^https?:\/\/pastebin\.com\/(\w+)\/?$/, raw: (id) => `https://pastebin.com/raw/${id}` },
  { pattern: /^https?:\/\/rentry\.co\/(\w+)\/?$/, raw: (id) => `https://rentry.co/paste/${id}/raw` },
]

const MOBALYTICS = /^https?:\/\/(?:www\.)?mobalytics\.gg\/poe-2\/(?:builds|profile)\//
const EMBEDDED_CODE = /e[AFJN][\w+/=-]{200,}/g
const VARIANT_ID = /activeVariantId,([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
const VARIANT_WINDOW = 600
const EMBEDDED_LINK = /https?:\/\/(?:pobb\.in|maxroll\.gg\/poe2\/pob|poe2?\.ninja\/(?:poe2\/)?pob|poe2db\.tw\/pob)\/[\w-]+/g

export class BuildImportError extends UserFacingError {}

export function decodePobCode(code: string): string {
  const cleaned = code.trim().replace(/\s+/g, '')
  if (cleaned.length === 0 || cleaned.length > MAX_CODE_LENGTH || !/^[\w+/=-]+$/.test(cleaned)) {
    throw new BuildImportError('That does not look like a Path of Building code or build link')
  }
  const bytes = Buffer.from(cleaned.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  try {
    return inflateSync(bytes, { maxOutputLength: MAX_XML_BYTES }).toString('utf8')
  } catch {
    throw new BuildImportError('That Path of Building code is incomplete. Copy it again and paste the whole code.')
  }
}

function profileFromCode(code: string, source: string, itemSet?: string): BuildProfile {
  return { ...profileFromPob(parsePobXml(decodePobCode(code), itemSet), source), code: code.trim().replace(/\s+/g, '') }
}

export function chooseItemSet(profile: BuildProfile, itemSet: string): BuildProfile {
  if (!profile.code || !profile.itemSets?.some(({ id }) => id === itemSet)) return profile
  const fresh = profileFromCode(profile.code, profile.source, itemSet)
  return { ...fresh, importedAt: profile.importedAt, custom: profile.custom }
}

async function download(fetcher: Fetcher, url: string): Promise<string> {
  try {
    return await fetcher(url)
  } catch {
    throw new BuildImportError(`Could not download the build from ${new URL(url).hostname}. Check your connection and try again.`)
  }
}

export function refreshProfile(profile: StoredProfile): BuildProfile {
  if (profile.version !== PROFILE_VERSION && profile.code) {
    try {
      const fresh = profileFromCode(profile.code, profile.source, profile.itemSet)
      return { ...fresh, importedAt: profile.importedAt, custom: profile.custom }
    } catch {}
  }
  return hasItems(profile) ? profile : { ...profile, items: {} }
}

export async function importBuild(input: string, fetcher: Fetcher): Promise<BuildProfile> {
  const value = input.trim()
  if (!/^https?:\/\//i.test(value)) return profileFromCode(value, 'Path of Building code')

  const paste = PASTE_SITES.map(({ pattern, raw }) => ({ match: pattern.exec(value), raw })).find(({ match }) => match)
  if (paste?.match) return profileFromCode(await download(fetcher, paste.raw(paste.match[1])), value)

  if (MOBALYTICS.test(value)) return fromMobalytics(value, fetcher)

  throw new BuildImportError(
    'That site is not supported yet. Paste a Path of Building code, or a pobb.in, poe.ninja, Maxroll or Mobalytics link.',
  )
}

async function fromMobalytics(url: string, fetcher: Fetcher): Promise<BuildProfile> {
  const html = await download(fetcher, url)
  const pickVariant = (profile: BuildProfile) => {
    const itemSet = variantItemSet(html, url, profile.itemSets)
    return itemSet ? chooseItemSet(profile, itemSet) : profile
  }
  for (const [code] of html.matchAll(EMBEDDED_CODE)) {
    try {
      return pickVariant(profileFromCode(code, url))
    } catch {
      continue
    }
  }
  for (const [link] of new Set(html.matchAll(EMBEDDED_LINK))) {
    try {
      return pickVariant(await importBuild(link, fetcher).then((profile) => ({ ...profile, source: url })))
    } catch {
      continue
    }
  }
  throw new BuildImportError(
    'Mobalytics did not include the build code in that page. On the build page, click "Copy Code" (Path of Building) and paste the code here instead.',
  )
}

function variantItemSet(html: string, url: string, itemSets: ItemSet[] = []): string | undefined {
  const variant = VARIANT_ID.exec(safeDecode(url))?.[1].toLowerCase()
  if (!variant || itemSets.length < 2) return undefined
  const page = html.toLowerCase()
  let best: { id: string; distance: number } | undefined
  for (let at = page.indexOf(variant); at >= 0; at = page.indexOf(variant, at + 1)) {
    const start = Math.max(0, at - VARIANT_WINDOW)
    const near = page.slice(start, at + VARIANT_WINDOW)
    for (const { id, title } of itemSets) {
      const pattern = new RegExp(`(?:"|&quot;)${RegExp.escape(title.toLowerCase())}(?:\\\\?"|&quot;)`, 'g')
      for (const match of near.matchAll(pattern)) {
        const position = start + match.index
        const between = position < at ? page.slice(position, at) : page.slice(at, position)
        if (/[{}]/.test(between)) continue
        const distance = Math.abs(position - at)
        if (!best || distance < best.distance) best = { id, distance }
      }
    }
  }
  return best?.id
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

