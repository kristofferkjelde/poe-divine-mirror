export class UserFacingError extends Error {}

export type Failure = { ok: false; error: string }

export type Result<T, F = object> = ({ ok: true } & T) | (Failure & F)

export function toResult(error: unknown, fallback: string): Failure {
  if (error instanceof UserFacingError) return { ok: false, error: error.message }
  console.error(fallback, error)
  return { ok: false, error: fallback }
}
