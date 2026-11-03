import { AsyncLocalStorage } from 'node:async_hooks'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// DSH 安装目录:优先 DSH_DIR,其次 npm 全局目录的常见位置
const DSH_CANDIDATES = [
  process.env.DSH_DIR,
  join(process.env.APPDATA ?? '', 'npm', 'node_modules', '@deepseek-ai', 'dsh'),
  join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming', 'npm', 'node_modules', '@deepseek-ai', 'dsh'),
].filter(Boolean)
const DSH_DIR = DSH_CANDIDATES.find((d) => existsSync(join(d, 'package.json')))
if (!DSH_DIR) throw new Error(`probe: 找不到 DSH 安装目录,试过: ${DSH_CANDIDATES.join(' | ')};可设 DSH_DIR 覆盖`)

const OPENAI = join(DSH_DIR, 'node_modules', 'openai', 'index.mjs')
const ANTHROPIC = join(DSH_DIR, 'node_modules', '@anthropic-ai', 'sdk', 'index.mjs')
const realFetch = globalThis.fetch
const marker = new Error('PROBE_PATCHED_FETCH')
const describe = (e) => ({ cause: String(e?.cause?.message ?? e?.message ?? ''), isMarker: e?.cause === marker })

const { default: OpenAI } = await import(pathToFileURL(OPENAI).href)
const Anthropic = (await import(pathToFileURL(ANTHROPIC).href)).default

globalThis.fetch = () => { throw marker }
const a = await new OpenAI({ apiKey: 'sk-probe', baseURL: 'http://127.0.0.1:9/v1' })
  .chat.completions.create({ model: 'p', messages: [{ role: 'user', content: 'x' }] }).catch(describe)
const b = await new Anthropic({ apiKey: 'sk-probe', baseURL: 'http://127.0.0.1:9' })
  .messages.create({ model: 'p', max_tokens: 8, messages: [{ role: 'user', content: 'x' }] }).catch(describe)
console.log('openai', a)
console.log('anthropic', b)

const als = new AsyncLocalStorage()
const seen = []
globalThis.fetch = async () => { seen.push(als.getStore()); return new Response('{}') }
const run = (id, fn) => als.run(id, fn)
const wrap = (iterable, id) => {
  const inner = iterable[Symbol.asyncIterator]()
  const step = (m, v) => run(id, () => inner[m]?.(v) ?? Promise.resolve({ done: true }))
  return { next: () => step('next'), return: (v) => step('return', v), [Symbol.asyncIterator]() { return this } }
}
async function* provider() { await fetch('https://relay.example/v1'); yield 1 }
async function* adapter() { for await (const c of provider()) yield c }
for await (const _ of wrap(adapter(), 'session-uuid-123')) {}
console.log('als', seen)

globalThis.fetch = realFetch
