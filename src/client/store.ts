import type {
  LlmConfigurableProvider, ModelCatalog, RemoteLlmFace, RemoteSessionFace, RemoteSettingsFace,
  SettingsDescribe, SettingsNamespaceView, SettingsPathOp,
} from './contract'

export const SETTINGS_NS = 'request-header-fix'

export const ACCOUNT_PROVIDER = 'deepseek-account'

const INVALIDATING_EVENTS = ['settings/document-updated', 'llm/adapters-updated'] as const

export interface HeaderFixFaces {
  readonly settings: RemoteSettingsFace
  readonly llm: RemoteLlmFace
  readonly session: RemoteSessionFace
  readonly on?: (event: string, listener: () => void) => () => void
}

export interface ModelRow {
  readonly id: string
  readonly name: string
}

export interface ProviderView {
  readonly provider: string
  readonly displayName: string
  readonly selected: readonly string[]
  readonly models: readonly ModelRow[]
  readonly selectedCount: number
  readonly failure: string | null
  readonly modelsUnavailable: boolean
}

export type SnapshotStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface HeaderFixSnapshot {
  readonly status: SnapshotStatus
  readonly error: string | null
  readonly writable: boolean
  readonly hostMissing: boolean
  readonly namespace: string | null
  readonly revision: number
  readonly selection: Readonly<Record<string, readonly string[]>>
  readonly groups: readonly ProviderView[]
  readonly pendingRows: Readonly<Record<string, boolean>>
  readonly pendingGroups: Readonly<Record<string, boolean>>
  readonly rowErrors: Readonly<Record<string, string>>
  readonly groupErrors: Readonly<Record<string, string>>
}

type WriteOutcome = { readonly ok: true } | { readonly ok: false; readonly message: string }

const EMPTY: HeaderFixSnapshot = {
  status: 'idle',
  error: null,
  writable: false,
  hostMissing: false,
  namespace: null,
  revision: 0,
  selection: {},
  groups: [],
  pendingRows: {},
  pendingGroups: {},
  rowErrors: {},
  groupErrors: {},
}

export function rowKey(provider: string, modelId: string): string {
  return `${provider}/${modelId}`
}

export function enableModel(current: readonly string[], modelId: string): readonly string[] {
  return [...new Set([...current, modelId])]
}

export function disableModel(current: readonly string[], modelId: string): readonly string[] {
  return current.filter(id => id !== modelId)
}

export function opsFor(provider: string, modelIds: readonly string[]): readonly SettingsPathOp[] {
  if (modelIds.length === 0) return [{ op: 'unset', path: ['headerFix', provider] }]
  return [{ op: 'set', path: ['headerFix', provider], value: modelIds }]
}

export function countSelected(models: readonly ModelRow[], selected: readonly string[]): number {
  return models.reduce((count, model) => (selected.includes(model.id) ? count + 1 : count), 0)
}

export function filterProviders(groups: readonly ProviderView[], query: string): readonly ProviderView[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return groups
  const filtered: ProviderView[] = []
  for (const group of groups) {
    if (includesText(needle, group.displayName) || includesText(needle, group.provider)) {
      filtered.push(group)
      continue
    }
    const models = group.models.filter(model => includesText(needle, model.name) || includesText(needle, model.id))
    if (models.length === 0) continue
    filtered.push({ ...group, models, selectedCount: countSelected(models, group.selected) })
  }
  return filtered
}

export class HeaderFixStore {
  private snapshot: HeaderFixSnapshot = EMPTY
  private readonly listeners = new Set<() => void>()
  private generation = 0
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(private readonly faces: () => HeaderFixFaces | null) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): HeaderFixSnapshot => this.snapshot

  start = (): (() => void) => {
    const on = this.faces()?.on
    if (on === undefined) return () => {}
    const disposers = INVALIDATING_EVENTS.map(event => on(event, () => {
      const status = this.snapshot.status
      if (status === 'idle' || status === 'loading') return
      void this.load()
    }))
    return () => {
      for (const dispose of disposers) dispose()
    }
  }

  async load(): Promise<void> {
    const generation = ++this.generation
    this.patch({ status: 'loading', error: null })
    const faces = this.faces()
    if (faces === null) {
      if (generation !== this.generation) return
      this.patch({
        status: 'error', error: null, hostMissing: false, namespace: null, revision: 0, selection: {}, groups: [],
      })
      return
    }
    let described: SettingsDescribe
    let providers: readonly LlmConfigurableProvider[]
    let catalog: ModelCatalog
    try {
      const [settingsAnswer, providersAnswer, catalogAnswer] = await Promise.all([
        faces.settings.describe(),
        faces.llm.listConfigurableProviders(),
        faces.session.modelCatalog(),
      ])
      if (generation !== this.generation) return
      if (!settingsAnswer.ok) {
        this.patch({ status: 'error', error: settingsAnswer.error.message })
        return
      }
      if (!providersAnswer.ok) {
        this.patch({ status: 'error', error: providersAnswer.error.message })
        return
      }
      if (!catalogAnswer.ok) {
        this.patch({ status: 'error', error: catalogAnswer.error.message })
        return
      }
      described = settingsAnswer.value
      providers = providersAnswer.value
      catalog = catalogAnswer.value
    } catch (error: unknown) {
      if (generation !== this.generation) return
      this.patch({ status: 'error', error: messageOf(error) })
      return
    }
    const namespaceView = locateNamespace(described)
    if (namespaceView === undefined) {
      this.patch({
        status: 'ready', error: null, hostMissing: true, writable: described.writable,
        namespace: null, revision: 0, selection: {}, groups: [],
      })
      return
    }
    const namespaces = new Map<string, SettingsNamespaceView>()
    for (const view of described.namespaces) namespaces.set(view.ns, view)
    const selection = readSelection(namespaceView.value)
    const groups = buildGroups(providers, namespaces, catalog, selection)
    this.patch({
      status: 'ready',
      error: null,
      hostMissing: false,
      writable: described.writable,
      namespace: namespaceView.ns,
      revision: namespaceView.revision,
      selection,
      groups,
      rowErrors: {},
      groupErrors: {},
    })
  }

  async setModel(provider: string, modelId: string, enabled: boolean): Promise<void> {
    const row = rowKey(provider, modelId)
    const snapshot = this.snapshot
    if (snapshot.namespace === null) return
    if (snapshot.pendingRows[row] === true || snapshot.pendingGroups[provider] === true) return
    this.patch({
      pendingRows: { ...snapshot.pendingRows, [row]: true },
      rowErrors: withoutKey(snapshot.rowErrors, row),
    })
    await this.enqueue(async () => {
      const latest = this.snapshot
      if (latest.namespace === null) {
        this.failRow(row, '')
        return
      }
      const current = latest.selection[provider] ?? []
      const next = enabled ? enableModel(current, modelId) : disableModel(current, modelId)
      const outcome = await this.write(latest.namespace, latest.revision, opsFor(provider, next))
      if (!outcome.ok) {
        this.failRow(row, outcome.message)
        return
      }
      await this.load()
      this.clearRow(row)
    })
  }

  async selectAllModels(provider: string): Promise<void> {
    const snapshot = this.snapshot
    if (snapshot.namespace === null) return
    if (snapshot.pendingGroups[provider] === true || hasPendingRow(snapshot, provider)) return
    const group = snapshot.groups.find(view => view.provider === provider)
    if (group === undefined || group.models.length === 0) return
    const modelIds = group.models.map(model => model.id)
    this.patch({
      pendingGroups: { ...snapshot.pendingGroups, [provider]: true },
      groupErrors: withoutKey(snapshot.groupErrors, provider),
    })
    await this.enqueue(async () => {
      const latest = this.snapshot
      if (latest.namespace === null) {
        this.failGroup(provider, '')
        return
      }
      const outcome = await this.write(latest.namespace, latest.revision, opsFor(provider, modelIds))
      if (!outcome.ok) {
        this.failGroup(provider, outcome.message)
        return
      }
      await this.load()
      this.clearGroup(provider)
    })
  }

  async clearProvider(provider: string): Promise<void> {
    const snapshot = this.snapshot
    if (snapshot.namespace === null) return
    if (snapshot.pendingGroups[provider] === true || hasPendingRow(snapshot, provider)) return
    this.patch({
      pendingGroups: { ...snapshot.pendingGroups, [provider]: true },
      groupErrors: withoutKey(snapshot.groupErrors, provider),
    })
    await this.enqueue(async () => {
      const latest = this.snapshot
      if (latest.namespace === null) {
        this.failGroup(provider, '')
        return
      }
      const outcome = await this.write(latest.namespace, latest.revision, opsFor(provider, []))
      if (!outcome.ok) {
        this.failGroup(provider, outcome.message)
        return
      }
      await this.load()
      this.clearGroup(provider)
    })
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.writeQueue.then(task, task)
    this.writeQueue = run.then(() => undefined, () => undefined)
    return run
  }

  private async write(namespace: string, revision: number, ops: readonly SettingsPathOp[]): Promise<WriteOutcome> {
    const faces = this.faces()
    if (faces === null) return { ok: false, message: '' }
    if (ops.length === 0) return { ok: true }
    try {
      let answer = await faces.settings.mutate(namespace, ops, revision)
      if (!answer.ok && answer.error.code === 'settings/conflict') {
        const described = await faces.settings.describe()
        const fresh = described.ok ? locateNamespace(described.value) : undefined
        if (fresh !== undefined) answer = await faces.settings.mutate(fresh.ns, ops, fresh.revision)
      }
      if (answer.ok) return { ok: true }
      return { ok: false, message: answer.error.message }
    } catch (error: unknown) {
      return { ok: false, message: messageOf(error) }
    }
  }

  private patch(patch: Partial<HeaderFixSnapshot>): void {
    this.publish({ ...this.snapshot, ...patch })
  }

  private publish(next: HeaderFixSnapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }

  private failRow(row: string, message: string): void {
    const latest = this.snapshot
    this.publish({
      ...latest,
      pendingRows: withoutKey(latest.pendingRows, row),
      rowErrors: { ...latest.rowErrors, [row]: message },
    })
  }

  private clearRow(row: string): void {
    this.patch({ pendingRows: withoutKey(this.snapshot.pendingRows, row) })
  }

  private failGroup(provider: string, message: string): void {
    const latest = this.snapshot
    this.publish({
      ...latest,
      pendingGroups: withoutKey(latest.pendingGroups, provider),
      groupErrors: { ...latest.groupErrors, [provider]: message },
    })
  }

  private clearGroup(provider: string): void {
    this.patch({ pendingGroups: withoutKey(this.snapshot.pendingGroups, provider) })
  }
}

function hasPendingRow(snapshot: HeaderFixSnapshot, provider: string): boolean {
  const prefix = `${provider}/`
  return Object.keys(snapshot.pendingRows).some(key => key.startsWith(prefix))
}

function includesText(needle: string, value: string): boolean {
  return value.toLowerCase().includes(needle)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function withoutKey<V>(record: Readonly<Record<string, V>>, key: string): Record<string, V> {
  const next: Record<string, V> = {}
  for (const [entryKey, entryValue] of Object.entries(record)) {
    if (entryKey !== key) next[entryKey] = entryValue
  }
  return next
}

function fieldAt(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  return (value as Record<string, unknown>)[key]
}

function hasPath(value: unknown, path: readonly string[]): boolean {
  let current = value
  for (const step of path) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return false
    const record = current as Record<string, unknown>
    if (!(step in record)) return false
    current = record[step]
  }
  return current !== undefined
}

function readSelection(value: unknown): Readonly<Record<string, readonly string[]>> {
  const field = fieldAt(value, 'headerFix')
  if (field === null || typeof field !== 'object' || Array.isArray(field)) return {}
  const selection: Record<string, readonly string[]> = {}
  for (const [provider, models] of Object.entries(field as Record<string, unknown>)) {
    if (!Array.isArray(models)) continue
    selection[provider] = models.filter((id): id is string => typeof id === 'string')
  }
  return selection
}

function locateNamespace(described: SettingsDescribe): SettingsNamespaceView | undefined {
  const direct = described.namespaces.find(namespace => namespace.ns === SETTINGS_NS)
  if (direct !== undefined) return direct
  return described.namespaces.find(namespace => schemaMentionsHeaderFix(namespace.schema))
}

function schemaMentionsHeaderFix(schema: unknown): boolean {
  if (schema === undefined) return false
  try {
    const serialized = JSON.stringify(schema)
    return serialized !== undefined && serialized.includes('"headerFix"')
  } catch {
    return false
  }
}

function buildGroups(
  providers: readonly LlmConfigurableProvider[],
  namespaces: ReadonlyMap<string, SettingsNamespaceView>,
  catalog: ModelCatalog,
  selection: Readonly<Record<string, readonly string[]>>,
): readonly ProviderView[] {
  const groupsById = new Map<string, (typeof catalog.groups)[number]>()
  for (const group of catalog.groups) groupsById.set(group.id, group)
  const failuresById = new Map<string, (typeof catalog.failures)[number]>()
  for (const failure of catalog.failures) failuresById.set(failure.id, failure)
  const views: ProviderView[] = []
  for (const provider of providers) {
    if (provider.provider === ACCOUNT_PROVIDER) continue
    const namespace = namespaces.get(provider.settingsNs)
    if (namespace === undefined) continue
    if (provider.settingsPath.length > 0 && !hasPath(namespace.value, provider.settingsPath)) continue
    const group = groupsById.get(provider.provider)
    const failure = failuresById.get(provider.provider)
    const models: readonly ModelRow[] = group === undefined
      ? []
      : group.models.map(model => ({ id: model.id, name: model.name }))
    const selected = selection[provider.provider] ?? []
    views.push({
      provider: provider.provider,
      displayName: provider.displayName,
      selected,
      models,
      selectedCount: countSelected(models, selected),
      failure: failure === undefined ? null : failure.message,
      modelsUnavailable: group === undefined && failure === undefined,
    })
  }
  return views
}
