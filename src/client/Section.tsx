import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import { IconChevronDownOutlineRegular, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from './contract'
import { filterProviders, rowKey, type HeaderFixSnapshot, type HeaderFixStore, type ProviderView } from './store'

export interface SectionProps {
  readonly t: Translate
  readonly store: HeaderFixStore
}

export function Section({ t, store }: SectionProps) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const groups = useMemo(() => filterProviders(snapshot.groups, query), [snapshot.groups, query])
  const searching = query.trim() !== ''
  useEffect(() => {
    void store.load()
  }, [store])

  const toggle = (provider: string): void => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(provider)) next.delete(provider)
      else next.add(provider)
      return next
    })
  }

  const hostMissing = snapshot.hostMissing
  const failed = snapshot.status === 'error'
  const initialLoading = !hostMissing && !failed && snapshot.groups.length === 0
    && (snapshot.status === 'idle' || snapshot.status === 'loading')
  const readOnly = !hostMissing && !failed && snapshot.status === 'ready' && !snapshot.writable

  let body: ReactElement
  if (failed) {
    body = (
      <div className="rhf-error">
        <p className="rhf-error-text">{t('loadFailed') + (snapshot.error ?? t('unavailable'))}</p>
        <button type="button" className="rhf-button" onClick={() => { void store.load() }}>
          {t('retry')}
        </button>
      </div>
    )
  } else if (hostMissing) {
    body = <p className="rhf-notice">{t('hostMissing')}</p>
  } else if (initialLoading) {
    body = <p className="rhf-empty">{t('loading')}</p>
  } else if (snapshot.groups.length === 0) {
    body = <p className="rhf-empty">{t('empty')}</p>
  } else if (groups.length === 0) {
    body = <p className="rhf-empty">{t('noResults')}</p>
  } else {
    body = (
      <div className="rhf-groups">
        {groups.map(group => (
          <ProviderCard
            key={group.provider}
            group={group}
            snapshot={snapshot}
            store={store}
            t={t}
            expanded={searching || expanded.has(group.provider)}
            onToggle={() => { toggle(group.provider) }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="rhf-root">
      <div className="rhf-header">
        <h2 className="rhf-title">{t('title')}</h2>
        <p className="rhf-description">{t('description')}</p>
      </div>
      {snapshot.groups.length > 0 ? (
        <div className="rhf-tools">
          <Input
            className="rhf-search"
            type="search"
            value={query}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            onChange={(event) => { setQuery(event.currentTarget.value) }}
          />
        </div>
      ) : null}
      {readOnly ? <p className="rhf-notice">{t('readonlyHint')}</p> : null}
      {body}
    </div>
  )
}

interface ProviderCardProps {
  readonly group: ProviderView
  readonly snapshot: HeaderFixSnapshot
  readonly store: HeaderFixStore
  readonly t: Translate
  readonly expanded: boolean
  readonly onToggle: () => void
}

function ProviderCard({ group, snapshot, store, t, expanded, onToggle }: ProviderCardProps) {
  const groupPending = snapshot.pendingGroups[group.provider] === true
  const locked = !snapshot.writable || groupPending
  const groupError = snapshot.groupErrors[group.provider]
  const rowsVisible = expanded && group.models.length > 0
  const bodyVisible = rowsVisible || group.failure !== null || groupError !== undefined || group.modelsUnavailable
  return (
    <section className="rhf-card" aria-label={group.displayName}>
      <header className={bodyVisible ? 'rhf-group-head rhf-group-head-bordered' : 'rhf-group-head'}>
        <button
          type="button"
          className="rhf-group-toggle"
          aria-expanded={expanded}
          aria-label={t('toggleProvider', { provider: group.displayName })}
          onClick={onToggle}
        >
          <IconChevronDownOutlineRegular
            className={expanded ? 'rhf-chevron rhf-chevron-open' : 'rhf-chevron'}
            size={14}
            aria-hidden="true"
          />
          <span className="rhf-group-name">{group.displayName}</span>
          <code className="rhf-mono rhf-provider-id">{group.provider}</code>
          <span className="rhf-count">
            {t('selectedCount', { selected: String(group.selectedCount), total: String(group.models.length) })}
          </span>
        </button>
        <div className="rhf-group-actions">
          <button
            type="button"
            className="rhf-text-button"
            disabled={locked || group.models.length === 0}
            onClick={() => { void store.selectAllModels(group.provider) }}
          >
            {t('selectAll')}
          </button>
          <button
            type="button"
            className="rhf-text-button"
            disabled={locked || group.models.length === 0 || group.selected.length === 0}
            onClick={() => { void store.clearProvider(group.provider) }}
          >
            {t('clear')}
          </button>
        </div>
      </header>
      {group.failure !== null ? <p className="rhf-group-error">{t('providerFailed', { message: group.failure })}</p> : null}
      {groupError !== undefined ? <p className="rhf-group-error">{writeErrorText(t, groupError)}</p> : null}
      {group.modelsUnavailable ? <p className="rhf-muted">{t('noModels')}</p> : null}
      {rowsVisible ? (
        <div className="rhf-rows">
          {group.models.map(model => {
            const row = rowKey(group.provider, model.id)
            const rowPending = snapshot.pendingRows[row] === true
            const rowError = snapshot.rowErrors[row]
            return (
              <div className="rhf-row-block" key={model.id}>
                <div className="rhf-row">
                  <div className="rhf-row-labels">
                    <span className="rhf-row-name">{model.name}</span>
                    <code className="rhf-mono rhf-model-id">{model.id}</code>
                  </div>
                  <Switch
                    checked={group.selected.includes(model.id)}
                    disabled={!snapshot.writable || groupPending || rowPending}
                    label={t('switchLabel', { model: model.name })}
                    title={!snapshot.writable ? t('readonlyHint') : undefined}
                    onChange={(next) => { void store.setModel(group.provider, model.id, next) }}
                  />
                </div>
                {rowError !== undefined ? <p className="rhf-row-error">{writeErrorText(t, rowError)}</p> : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function writeErrorText(t: Translate, message: string): string {
  return message === '' ? t('unavailable') : t('writeFailed') + message
}
