import { UserFacingError } from '../errors'

interface ItemsBody {
  result?: Array<{ entries?: Array<{ type?: unknown }> }>
}

export function baseTypeNames(body: unknown): string[] {
  const names = ((body as ItemsBody | null)?.result ?? []).flatMap((group) =>
    (group.entries ?? []).flatMap((entry) => (typeof entry.type === 'string' ? [entry.type] : [])),
  )
  if (names.length === 0) throw new UserFacingError('The trade site sent unexpected item data')
  return [...new Set(names)]
}

export function magicBaseType(name: string, types: string[]): string | undefined {
  return types
    .filter((type) => new RegExp(`(^|\\s)${RegExp.escape(type)}($|\\s)`).test(name))
    .sort((a, b) => b.length - a.length)[0]
}
