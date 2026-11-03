import { isModelSelected, readSelectedModels } from './config'
import { currentStamp } from './sessionContext'

export interface ShimLogger {
  warn?(message: string): void
}

const HEADER = 'x-opencode-session'

export function installFetchShim(readConfig: () => unknown, logger?: ShimLogger): () => void {
  const previous = globalThis.fetch
  const patched: typeof fetch = async (input, init) => {
    const stamp = currentStamp()
    if (stamp === undefined) return previous(input, init)
    let forward: { input: RequestInfo | URL; init: RequestInit | undefined } = { input, init }
    try {
      if (isModelSelected(readSelectedModels(readConfig()), stamp.provider, stamp.model)) {
        const headers = new Headers(input instanceof Request ? input.headers : undefined)
        if (init?.headers !== undefined) new Headers(init.headers).forEach((value, key) => headers.set(key, value))
        headers.set(HEADER, stamp.sessionId)
        forward = { input, init: { ...init, headers } }
      }
    } catch (error) {
      logger?.warn?.(`request-header-fix: ${error instanceof Error ? error.message : String(error)}`)
      forward = { input, init }
    }
    return previous(forward.input, forward.init)
  }
  globalThis.fetch = patched
  return () => {
    if (globalThis.fetch === patched) globalThis.fetch = previous
  }
}
