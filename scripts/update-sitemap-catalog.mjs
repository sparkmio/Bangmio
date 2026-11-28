import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'

const [archive, sourceDate] = process.argv.slice(2)
if (!archive || !/^\d{4}-\d{2}-\d{2}$/.test(sourceDate || '')) {
  throw new Error('Usage: node scripts/update-sitemap-catalog.mjs <Archive zip> <YYYY-MM-DD>')
}

// The official Bangumi Archive contains concrete subject IDs. Using its
// snapshot avoids fetching thousands of browse pages on the request path.
const shardSize = 10_000
const bitsets = new Map()
const child = process.platform === 'win32'
  ? spawn('tar.exe', ['-xOf', archive, 'subject.jsonlines'])
  : spawn('unzip', ['-p', archive, 'subject.jsonlines'])
child.stderr.pipe(process.stderr)
const closed = once(child, 'close')
let count = 0
for await (const line of createInterface({ input: child.stdout, crlfDelay: Infinity })) {
  if (!line) continue
  const subject = JSON.parse(line)
  const id = subject.id
  if (!Number.isSafeInteger(id) || id < 1 || subject.nsfw === true || subject.nsfw === 1) continue
  const shard = Math.floor(id / shardSize)
  const offset = id % shardSize
  const bits = bitsets.get(shard) || Buffer.alloc(shardSize / 8)
  const mask = 1 << (offset % 8)
  const byte = Math.floor(offset / 8)
  if ((bits[byte] & mask) === 0) count++
  bits[byte] |= mask
  bitsets.set(shard, bits)
}
const [exitCode] = await closed
if (exitCode !== 0 || count === 0) throw new Error('Failed to read subject IDs from Bangumi Archive')

const shards = Object.fromEntries([...bitsets].sort(([a], [b]) => a - b)
  .map(([id, bits]) => [id, bits.toString('base64')]))
await writeFile(new URL('../lib/sitemap-catalog.json', import.meta.url),
  JSON.stringify({ sourceDate, count, shardSize, shards }, null, 2) + '\n')
console.log(`Catalog contains ${count} public subjects in ${bitsets.size} shards.`)
