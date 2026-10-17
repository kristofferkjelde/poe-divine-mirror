import { inflateRawSync } from 'node:zlib'

const END_OF_DIRECTORY = 0x06054b50
const DIRECTORY_ENTRY = 0x02014b50
const LOCAL_ENTRY = 0x04034b50
const STORED = 0
const DEFLATED = 8
const MAX_COMMENT = 0xffff
const MAX_ENTRY_BYTES = 5_000_000

export interface ZipEntry {
  name: string
  data: Buffer
}

export const isZip = (data: Uint8Array) => data.length >= 4 && Buffer.from(data.subarray(0, 4)).readUInt32LE(0) === LOCAL_ENTRY

export function unzip(zip: Buffer): ZipEntry[] {
  const end = endOfDirectory(zip)
  if (end < 0) throw new Error('Not a zip file')
  const entries: ZipEntry[] = []
  let at = zip.readUInt32LE(end + 16)
  for (let index = zip.readUInt16LE(end + 10); index > 0; index--) {
    if (zip.readUInt32LE(at) !== DIRECTORY_ENTRY) throw new Error('Broken zip file')
    const method = zip.readUInt16LE(at + 10)
    const compressedSize = zip.readUInt32LE(at + 20)
    const size = zip.readUInt32LE(at + 24)
    const nameLength = zip.readUInt16LE(at + 28)
    const offset = zip.readUInt32LE(at + 42)
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength)
    at += 46 + nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32)
    if (name.endsWith('/') || size > MAX_ENTRY_BYTES || zip.readUInt32LE(offset) !== LOCAL_ENTRY) continue
    const start = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28)
    const raw = zip.subarray(start, start + compressedSize)
    if (method === STORED) entries.push({ name, data: raw })
    if (method === DEFLATED) entries.push({ name, data: inflateRawSync(raw, { maxOutputLength: MAX_ENTRY_BYTES }) })
  }
  return entries
}

function endOfDirectory(zip: Buffer): number {
  for (let at = zip.length - 22; at >= Math.max(0, zip.length - 22 - MAX_COMMENT); at--) {
    if (zip.readUInt32LE(at) === END_OF_DIRECTORY) return at
  }
  return -1
}
