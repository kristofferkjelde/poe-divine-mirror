interface ItemsBody {
  result?: Array<{ entries?: Array<{ type?: unknown }> }>
}

export function baseTypeNames(body: unknown): string[] {
  const names = ((body as ItemsBody | null)?.result ?? []).flatMap((group) =>
    (group.entries ?? []).flatMap((entry) => (typeof entry.type === 'string' ? [entry.type] : [])),
  )
  return [...new Set(names)]
}


export function magicBaseType(name: string, types: string[]): string | undefined {
  return types
    .filter((type) => new RegExp(`(^|\\s)${RegExp.escape(type)}($|\\s)`).test(name))
    .sort((a, b) => b.length - a.length)[0]
}
