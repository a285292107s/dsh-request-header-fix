import z from '@deepseek-ai/schemastery'
import { installFetchShim } from './host/fetchShim'
import { withSession, type RequestStamp } from './host/sessionContext'

interface HostLogger {
  info?(message: string): void
  warn?(message: string): void
}

interface SettingsPresentation {
  auto?: boolean
}

interface HostContext {
  readonly fiber: unknown
  readonly logger?: HostLogger
  readonly settings: {
    configure(presentation: SettingsPresentation, owner: unknown): () => void
  }
  effect(callback: () => (() => void) | void, label?: string): void
  on(
    name: string,
    listener: (options: unknown, next: () => AsyncIterable<unknown>) => AsyncIterable<unknown>,
    options?: { global?: boolean; prepend?: boolean },
  ): void
}

interface HeaderFixSection {
  readonly headerFix: { get(): unknown }
}

interface StreamOptions {
  readonly provider?: unknown
  readonly model?: unknown
  readonly sessionId?: unknown
}

export const name = 'request-header-fix'
export const inject = ['settings']
export const Config = z.object({
  headerFix: z.dict(z.array(z.string())).default({}).volatile(),
})

export function apply(ctx: HostContext, config: HeaderFixSection): void {
  ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber), 'request-header-fix: hide auto config form')
  ctx.effect(() => {
    const restore = installFetchShim(() => config, ctx.logger)
    ctx.logger?.info?.('request-header-fix: fetch shim installed')
    return () => {
      restore()
      ctx.logger?.info?.('request-header-fix: fetch shim removed')
    }
  }, 'request-header-fix: fetch shim')
  ctx.on(
    'llm/stream',
    (options, next) => {
      const stamp = stampOf(options)
      return stamp === undefined ? next() : withSession(stamp, next())
    },
    { global: true, prepend: true },
  )
}

function stampOf(options: unknown): RequestStamp | undefined {
  if (options === null || typeof options !== 'object') return undefined
  const candidate = options as StreamOptions
  const { provider, model, sessionId } = candidate
  if (typeof provider !== 'string' || typeof model !== 'string') return undefined
  if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
  return { provider, model, sessionId }
}
