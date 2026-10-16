import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [repoe = '../poe2'] = process.argv.slice(2)
const data = join(repoe, 'data')
const read = (name) => JSON.parse(readFileSync(join(data, name), 'utf8'))
const published = new Set(
  execFileSync('git', ['-C', repoe, 'ls-tree', '-r', '--name-only', 'HEAD', 'data/Art/2DItems'], { encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\n')
    .filter((path) => path.endsWith('.webp')),
)

const artPath = (dds) => {
  const match = /^Art\/2DItems\/(.+)\.dds$/.exec(dds ?? '')
  return match && published.has(`data/Art/2DItems/${match[1]}.webp`) ? match[1] : null
}

const collect = (entries) => {
  const art = {}
  for (const { name, path } of entries) if (name && path && !(name in art)) art[name] = path
  return Object.fromEntries(Object.entries(art).sort(([a], [b]) => a.localeCompare(b)))
}

const bases = collect(
  Object.values(read('base_items.json'))
    .filter((base) => ['item', 'flask'].includes(base.domain) && base.release_state !== 'unreleased')
    .map((base) => ({ name: base.name, path: artPath(base.visual_identity?.dds_file) })),
)
const uniques = collect(
  Object.values(read('uniques.json'))
    .filter((unique) => !unique.is_alternate_art)
    .map((unique) => ({ name: unique.name, path: artPath(unique.visual_identity?.dds_file) })),
)

writeFileSync('src/shared/item/art.json', `${JSON.stringify({ bases, uniques })}\n`)
console.log(`${Object.keys(bases).length} bases, ${Object.keys(uniques).length} uniques`)
