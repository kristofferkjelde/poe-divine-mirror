const TYPES = new Set([
  'Currency',
  'Fragments',
  'Abyss',
  'UncutGems',
  'LineageSupportGems',
  'Essences',
  'SoulCores',
  'Idols',
  'Runes',
  'Ritual',
  'Expedition',
  'Delirium',
  'Breach',
  'Verisium',
])

const LEAGUE = /^[\p{L}\p{N} '()-]{1,60}$/u
const SOURCE = 'https://poe.ninja/poe2/api/economy/exchange/current/overview'
const USER_AGENT = 'DivineMirror/1.0 (+https://www.poe-divine-mirror.com)'

const reply = (status: number, body: string, cache: string, lastModified?: string) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
      ...(lastModified && { 'Last-Modified': lastModified }),
    },
  })

function snapshotTime(headers: Headers): string {
  const modified = headers.get('last-modified')
  if (modified && Number.isFinite(Date.parse(modified))) return modified
  const sent = Date.parse(headers.get('date') ?? '')
  const age = Number(headers.get('age') ?? 0)
  return new Date(Number.isFinite(sent) && Number.isFinite(age) ? sent - age * 1000 : Date.now()).toUTCString()
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const league = params.get('league') ?? ''
  const type = params.get('type') ?? ''
  if (!LEAGUE.test(league) || !TYPES.has(type)) {
    return reply(400, JSON.stringify({ error: 'Unknown league or type' }), 'public, max-age=3600')
  }

  const upstream = await fetch(`${SOURCE}?${new URLSearchParams({ league, type })}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  }).catch(() => null)
  if (!upstream?.ok) {
    return reply(
      502,
      JSON.stringify({
        error: `poe.ninja answered ${upstream?.status ?? 'nothing'}`,
      }),
      'public, s-maxage=60',
    )
  }
  return reply(
    200,
    await upstream.text(),
    'public, max-age=300, s-maxage=900, stale-while-revalidate=600',
    snapshotTime(upstream.headers),
  )
}
