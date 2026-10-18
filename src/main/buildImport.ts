import { inflateSync } from 'node:zlib'
import { mobalyticsStages, type MobalyticsStage } from '../shared/build/mobalytics'
import { parsePlannerBuild, PlannerParseError, stageKey, type PlannerStage } from '../shared/build/planner'
import { parsePobXml, type ItemSet, type StageGear } from '../shared/build/pob'
import { hasItems, PROFILE_VERSION, profileFromPob, type BuildProfile, type StoredProfile } from '../shared/build/profile'
import { UserFacingError } from '../shared/errors'
import type { BuildFile, StageFileResult } from '../shared/ipc'
import { isZip, unzip } from './zip'

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

function profileFromCode(code: string, source: string, itemSet?: string, stageGear?: StageGear): BuildProfile {
  const profile = profileFromPob(parsePobXml(decodePobCode(code), itemSet, stageGear), source)
  return { ...profile, code: code.trim().replace(/\s+/g, ''), ...(stageGear && { stageGear }) }
}

function reparse(profile: BuildProfile & { code: string }, itemSet?: string, stageGear?: StageGear): BuildProfile {
  const fresh = profileFromCode(profile.code, profile.source, itemSet, stageGear)
  return { ...fresh, importedAt: profile.importedAt, custom: profile.custom }
}

export function chooseItemSet(profile: BuildProfile, itemSet: string): BuildProfile {
  if (!profile.code || !profile.itemSets?.some(({ id }) => id === itemSet)) return profile
  return reparse({ ...profile, code: profile.code }, itemSet, profile.stageGear)
}

function stageIds(profile: BuildProfile): Map<string, string> {
  return new Map(profile.itemSets?.map(({ id, title }) => [stageKey(title), id]))
}

function withStageGear(profile: BuildProfile, stages: PlannerStage[]): BuildProfile {
  const ids = stageIds(profile)
  const matched = stages.flatMap(({ title, gear }) => {
    const id = ids.get(stageKey(title))
    return id && Object.keys(gear).length > 0 ? [[id, gear] as const] : []
  })
  if (!profile.code || matched.length === 0) return profile
  return reparse({ ...profile, code: profile.code }, profile.itemSet, { ...profile.stageGear, ...Object.fromEntries(matched) })
}

export interface FileStage extends PlannerStage {
  file: string
}

export interface ReadStages {
  stages: FileStage[]
  failed: StageFileResult[]
}

export function stagesFromFiles(files: BuildFile[]): ReadStages {
  const stages: FileStage[] = []
  const failed: StageFileResult[] = []
  const read = (file: string, text: string) => {
    try {
      stages.push({ file, ...parsePlannerBuild(text, file) })
    } catch (error) {
      failed.push({ file, error: error instanceof UserFacingError ? error.message : `${file} could not be read` })
    }
  }
  for (const { name, data } of files) {
    if (!isZip(data)) {
      read(name, Buffer.from(data).toString('utf8'))
      continue
    }
    let entries
    try {
      entries = unzip(Buffer.from(data)).filter((entry) => /\.build$/i.test(entry.name))
    } catch {
      failed.push({ file: name, error: `${name} is not a zip file the app can open` })
      continue
    }
    if (entries.length === 0) failed.push({ file: name, error: `There are no .build files in ${name}` })
    for (const entry of entries) read(entry.name.split('/').pop() ?? entry.name, entry.data.toString('utf8'))
  }
  return { stages, failed }
}

export function addStages(profile: BuildProfile | null, { stages, failed }: ReadStages): { profile: BuildProfile; report: StageFileResult[] } {
  if (!profile?.code) throw new BuildImportError("Import the build's Path of Building code or link first, then add its .build files.")
  const ids = stageIds(profile)
  const titles = profile.itemSets?.map(({ title }) => title).join(', ') || 'none'
  const report: StageFileResult[] = stages.map(({ file, title, gear }) => {
    if (!ids.has(stageKey(title))) return { file, error: `"${title}" is not a gear stage of this build. Its stages are: ${titles}.` }
    const items = Object.keys(gear).length
    return items > 0 ? { file, stage: title, items } : { file, error: `"${title}" has no equipped items` }
  })
  return { profile: withStageGear(profile, stages), report: [...report, ...failed] }
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
      const fresh = profileFromCode(profile.code, profile.source, profile.itemSet, profile.stageGear)
      return { ...fresh, importedAt: profile.importedAt, custom: profile.custom }
    } catch {}
  }
  return hasItems(profile) ? profile : { ...profile, items: {} }
}

export async function importBuild(input: string, fetcher: Fetcher, readPage: Fetcher = fetcher): Promise<BuildProfile> {
  const value = input.trim()
  if (!/^https?:\/\//i.test(value)) return profileFromCode(value, 'Path of Building code')

  const paste = PASTE_SITES.map(({ pattern, raw }) => ({ match: pattern.exec(value), raw })).find(({ match }) => match)
  if (paste?.match) return profileFromCode(await download(fetcher, paste.raw(paste.match[1])), value)

  if (MOBALYTICS.test(value)) return fromMobalytics(value, fetcher, readPage)

  throw new BuildImportError(
    'That site is not supported yet. Paste a Path of Building code, or a pobb.in, poe.ninja, Maxroll or Mobalytics link.',
  )
}

async function fromMobalytics(url: string, fetcher: Fetcher, readPage: Fetcher): Promise<BuildProfile> {
  const html = await download(readPage, url).catch(() => download(fetcher, url))
  const stages = mobalyticsStages(parseState(html))
  const pickVariant = (profile: BuildProfile) => {
    const itemSet = stageItemSet(stages, url, profile) ?? variantItemSet(html, url, profile.itemSets)
    return withStageGear(itemSet ? chooseItemSet(profile, itemSet) : profile, stages)
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

function parseState(page: string): unknown {
  try {
    return JSON.parse(page)
  } catch {
    return null
  }
}

function stageItemSet(stages: MobalyticsStage[], url: string, profile: BuildProfile): string | undefined {
  const variant = VARIANT_ID.exec(safeDecode(url))?.[1].toLowerCase()
  const title = stages.find(({ id }) => id.toLowerCase() === variant)?.title
  return title ? stageIds(profile).get(stageKey(title)) : undefined
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

