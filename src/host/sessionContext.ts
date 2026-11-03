import { AsyncLocalStorage } from 'node:async_hooks'

export interface RequestStamp {
  readonly sessionId: string
  readonly provider: string
  readonly model: string
}

const SLOT = Symbol.for('dsh.request-header-fix.als')

type GlobalSlot = Record<symbol, AsyncLocalStorage<RequestStamp> | undefined>

function storage(): AsyncLocalStorage<RequestStamp> {
  const slot = globalThis as unknown as GlobalSlot
  const existing = slot[SLOT]
  if (existing !== undefined) return existing
  const created = new AsyncLocalStorage<RequestStamp>()
  slot[SLOT] = created
  return created
}

export function currentStamp(): RequestStamp | undefined {
  return storage().getStore()
}

export function withSession<T>(stamp: RequestStamp, iterable: AsyncIterable<T>): AsyncIterable<T> {
  const als = storage()
  const iterator = iterable[Symbol.asyncIterator]()
  const step = (operation: () => Promise<IteratorResult<T>>): Promise<IteratorResult<T>> => als.run(stamp, operation)
  const wrapped: AsyncIterableIterator<T> = {
    next: () => step(() => iterator.next()),
    return: (value?: T) =>
      step(() => (iterator.return === undefined ? Promise.resolve<IteratorResult<T>>({ done: true, value: undefined }) : iterator.return(value))),
    throw: (error?: unknown) => step(() => (iterator.throw === undefined ? Promise.reject(error) : iterator.throw(error))),
    [Symbol.asyncIterator]() {
      return this
    },
  }
  return wrapped
}
