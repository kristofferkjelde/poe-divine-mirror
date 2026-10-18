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

const reply = (status: number, body: string, cache: string) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
    },
  })

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
  return reply(200, await upstream.text(), 'public, max-age=600, s-maxage=3600, stale-while-revalidate=3600')
}
