export type Translate = (key: string, params?: Record<string, string>) => string

export interface LocaleFace {
  register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
  bind(namespace: string): Translate
}

export interface RemoteFailure {
  readonly code: string
  readonly message: string
}

export type RemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RemoteFailure }

export interface SettingsPathOpSet {
  readonly op: 'set'
  readonly path: readonly string[]
  readonly value: unknown
}

export interface SettingsPathOpUnset {
  readonly op: 'unset'
  readonly path: readonly string[]
}

export type SettingsPathOp = SettingsPathOpSet | SettingsPathOpUnset

export interface SettingsNamespaceView {
  readonly ns: string
  readonly revision: number
  readonly value: unknown
  readonly user?: unknown
  readonly base?: unknown
  readonly schema?: unknown
}

export interface SettingsDescribe {
  readonly writable: boolean
  readonly namespaces: readonly SettingsNamespaceView[]
}

export interface LlmConfigurableProvider {
  readonly provider: string
  readonly displayName: string
  readonly settingsNs: string
  readonly settingsPath: readonly string[]
}

export interface ModelSelection {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

export interface ModelCatalogModel {
  readonly id: string
  readonly name: string
  readonly description?: string
}

export interface ModelProviderGroup {
  readonly id: string
  readonly name: string
  readonly models: readonly ModelCatalogModel[]
}

export interface ModelCatalogFailure {
  readonly id: string
  readonly name: string
  readonly message: string
}

export interface ModelCatalog {
  readonly default: ModelSelection
  readonly routableProviders: readonly string[]
  readonly groups: readonly ModelProviderGroup[]
  readonly failures: readonly ModelCatalogFailure[]
}

export interface RemoteSettingsFace {
  describe(): Promise<RemoteResult<SettingsDescribe>>
  mutate(
    ns: string,
    ops: readonly SettingsPathOp[],
    expectedRevision?: number,
  ): Promise<RemoteResult<SettingsNamespaceView>>
}

export interface RemoteLlmFace {
  listConfigurableProviders(): Promise<RemoteResult<readonly LlmConfigurableProvider[]>>
}

export interface RemoteSessionFace {
  modelCatalog(): Promise<RemoteResult<ModelCatalog>>
}

export interface RemoteFace {
  $on(event: string, listener: () => void): () => void
}

export interface SlotRegisterOptions {
  readonly name: string
  readonly id?: string
  readonly order?: number
  readonly label?: string | (() => string)
  readonly locale?: string
  readonly inject?: () => Record<string, unknown>
}

export interface SlotsFace {
  inject(name: string, callback: () => unknown): void
  register(options: SlotRegisterOptions, component: unknown): () => void
}

export interface ClientContext {
  effect(callback: () => void | (() => void), label?: string): void
  get(name: 'locale'): LocaleFace | undefined
  get(name: 'remote'): RemoteFace | undefined
  get(name: 'remote.settings'): RemoteSettingsFace | undefined
  get(name: 'remote.llm'): RemoteLlmFace | undefined
  get(name: 'remote.session'): RemoteSessionFace | undefined
  get(name: string): unknown
  readonly slots: SlotsFace
}
