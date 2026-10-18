const LEAGUE = /^[\p{L}\p{N} '()-]{1,60}$/u
const TYPE = /^[A-Za-z]{1,40}$/
const APP_AGENT = /^DivineMirror\/[\w.-]{1,20} /
const SOURCE = 'https://poe.ninja/poe2/api/economy/exchange/current/overview'
const USER_AGENT = 'DivineMirror (+https://www.poe-divine-mirror.com)'
const SOURCE_TIMES = { 'last-modified': 'X-Source-Last-Modified', date: 'X-Source-Date', age: 'X-Source-Age' }

const reply = (status: number, body: string, cache: string, extra: Record<string, string> = {}) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, ...extra },
  })

function sourceTimes(headers: Headers): Record<string, string> {
  const times: Record<string, string> = {}
  for (const [name, header] of Object.entries(SOURCE_TIMES)) {
    const value = headers.get(name)
    if (value) times[header] = value
  }
  const modified = headers.get('last-modified')
  return modified ? { ...times, 'Last-Modified': modified } : times
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const league = params.get('league') ?? ''
  const type = params.get('type') ?? ''
  if (!LEAGUE.test(league) || !TYPE.test(type)) {
    return reply(400, JSON.stringify({ error: 'Unknown league or type' }), 'public, max-age=3600')
  }

  const agent = request.headers.get('user-agent') ?? ''
  const upstream = await fetch(`${SOURCE}?${new URLSearchParams({ league, type })}`, {
    headers: { 'User-Agent': APP_AGENT.test(agent) ? agent : USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
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
    sourceTimes(upstream.headers),
  )
}
