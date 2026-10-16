import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [dir = 'release'] = process.argv.slice(2)
const file = join(dir, 'latest.yml')
const yml = readFileSync(file, 'utf8')
const installer = /^path: (.+)$/m.exec(yml)?.[1].trim().replace(/^['"]|['"]$/g, '')
if (!installer) throw new Error(`${file} names no installer`)

const bytes = readFileSync(join(dir, installer))
const sha512 = createHash('sha512').update(bytes).digest('base64')
const size = statSync(join(dir, installer)).size

writeFileSync(file, yml.replace(/^(\s*sha512: ).+$/gm, `$1${sha512}`).replace(/^(\s*size: ).+$/gm, `$1${size}`))
console.log(`${installer}: ${size} bytes, sha512 ${sha512.slice(0, 16)}…`)
