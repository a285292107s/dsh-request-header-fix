import { build } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/dsh-client-ui-primitives',
]

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const PACKAGE_NAME = String(pkg.name)

async function main() {
  mkdirSync(resolve(root, 'lib'), { recursive: true })

  const host = await build({
    entryPoints: [resolve(root, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2022',
    packages: 'external',
    write: false,
  })
  writeFileSync(resolve(root, 'lib/index.js'), withoutSourceMarkers(host.outputFiles[0].text))

  const client = await build({
    entryPoints: [resolve(root, 'src/client/index.ts')],
    bundle: true,
    platform: 'browser',
    format: 'cjs',
    target: 'es2022',
    charset: 'utf8',
    external: CLIENT_EXTERNALS,
    write: false,
  })
  const bundled = withoutSourceMarkers(client.outputFiles[0].text)
  const factory = [
    'var module = { exports: {} }; var exports = module.exports;',
    bundled,
    'return module.exports;',
  ].join('\n')
  const wrapped =
    'window.__ModuleLoader__.load({\n' +
    `  id: ${JSON.stringify(PACKAGE_NAME)},\n` +
    '  factory: (require) => {\n' +
    factory.split('\n').map((line) => `    ${line}`).join('\n') +
    '\n  },\n' +
    '});\n'
  writeFileSync(resolve(root, 'lib/client.js'), wrapped)

  verifyClientBundle(wrapped)
  await verifyHostBundle()

  console.log('built lib/index.js (host) and lib/client.js (lazy-CJS browser bundle)')
}

function withoutSourceMarkers(code) {
  return code.replace(/^[ \t]*\/\/ [^\n]*\.(?:ts|tsx)[ \t]*\r?\n/gm, '')
}

function verifyClientBundle(code) {
  const problems = []
  if (!code.startsWith('window.__ModuleLoader__.load(')) {
    problems.push('wrapper does not start with window.__ModuleLoader__.load(')
  }
  if (!code.includes(`id: ${JSON.stringify(PACKAGE_NAME)}`)) {
    problems.push(`entry id is not the package name ${JSON.stringify(PACKAGE_NAME)}`)
  }

  const required = new Set()
  const stub = new Proxy(function () {}, {
    get: (_target, key) => (key === '__esModule' ? false : stub),
    apply: () => stub,
    construct: () => stub,
  })
  const requireStub = (name) => {
    required.add(name)
    return stub
  }
  try {
    let entry
    new Function('window', 'require', code)(
      { __ModuleLoader__: { load: (value) => { entry = value } } },
      requireStub,
    )
    if (entry === undefined) {
      problems.push('bundle never calls window.__ModuleLoader__.load')
    } else {
      const exported = entry.factory(requireStub)
      if (typeof exported.apply !== 'function') problems.push('client entry has no named export.apply')
      if (!Array.isArray(exported.inject)) problems.push('client entry has no named export.inject (array)')
      if (exported.default !== undefined) problems.push('client entry must not export default: it would hide .inject')
    }
  } catch (error) {
    problems.push(`client bundle cannot self-check: ${error instanceof Error ? error.message : String(error)}`)
  }
  for (const name of required) {
    if (!CLIENT_EXTERNALS.includes(name)) {
      problems.push(`client bundle requires "${name}", which is not in the DSH baseline list`)
    }
  }
  if (problems.length > 0) {
    throw new Error(`lib/client.js does not satisfy the DSH wiring contract:\n  - ${problems.join('\n  - ')}`)
  }
}

async function verifyHostBundle() {
  const module = await import(pathToFileURL(resolve(root, 'lib/index.js')).href)
  if (typeof module.apply !== 'function') {
    throw new Error('lib/index.js does not export a host `apply`')
  }
  if (typeof module.Config === 'undefined') {
    throw new Error('lib/index.js does not export a host `Config`')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
