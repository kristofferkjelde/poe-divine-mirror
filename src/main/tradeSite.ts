import { UserFacingError } from '../shared/errors'
import { rateLimitWait, TRADE_ORIGIN } from '../shared/trade/price'
import { apiHeaders, send } from './http'

export class TradeError extends UserFacingError {}

export class SlowDownError extends TradeError {
  constructor(readonly retryAt: number) {
    super(`The trade site asked us to slow down. Try again in ${Math.ceil((retryAt - Date.now()) / 1000)}s.`)
  }
}

export class TradeSite {
  private blockedUntil = 0

  async request(path: string, body?: unknown): Promise<unknown> {
    if (this.blockedUntil > Date.now()) throw new SlowDownError(this.blockedUntil)

    let response: Response
    try {
      response = await send(`${TRADE_ORIGIN}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { ...apiHeaders(), ...(body !== undefined && { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (error) {
      console.warn(`Trade site request failed: ${path}`, error)
      throw new TradeError('Could not reach the trade site')
    }

    const limitWait = Math.max(
      rateLimitWait(response.headers.get('x-rate-limit-ip'), response.headers.get('x-rate-limit-ip-state')),
      rateLimitWait(response.headers.get('x-rate-limit-account'), response.headers.get('x-rate-limit-account-state')),
    )
    if (limitWait > 0) this.blockedUntil = Date.now() + limitWait

    if (response.status === 429) {
      const retry = Number(response.headers.get('retry-after')) || 60
      this.blockedUntil = Math.max(this.blockedUntil, Date.now() + retry * 1000)
      throw new SlowDownError(this.blockedUntil)
    }
    if (!response.ok) {
      const message = await response
        .json()
        .then((json) => (json as { error?: { message?: string } }).error?.message)
        .catch(() => undefined)
      throw new TradeError(message ? `Trade site: ${message}` : `The trade site answered ${response.status}`)
    }
    return response.json()
  }
}
