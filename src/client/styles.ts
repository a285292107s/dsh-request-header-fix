const STYLE_ID = 'dsh-request-header-fix-styles'

const CSS = `
.rhf-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
}

.rhf-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rhf-title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
}

.rhf-description {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}

.rhf-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rhf-search {
  width: 100%;
  max-width: 320px;
}

.rhf-card {
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-settings-card-fill);
}

.rhf-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
}

.rhf-group-head-bordered {
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.rhf-group-toggle {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.rhf-group-toggle:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
  outline-offset: 2px;
  border-radius: var(--dsw-radius-sm);
}

.rhf-chevron {
  flex: none;
  align-self: center;
  color: var(--dsw-alias-label-tertiary);
  transform: rotate(-90deg);
  transition: transform 120ms ease;
}

.rhf-chevron-open {
  transform: rotate(0deg);
}

.rhf-group-name {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
}

.rhf-group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rhf-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.rhf-provider-id {
  color: var(--dsw-alias-label-dimmed);
  font-size: 11px;
  line-height: 16px;
}

.rhf-count {
  margin-left: auto;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
}

.rhf-text-button {
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  padding: 2px 6px;
  cursor: pointer;
}

.rhf-text-button:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.rhf-text-button:disabled {
  color: var(--dsw-alias-label-dimmed);
  cursor: not-allowed;
}

.rhf-text-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
  outline-offset: 1px;
}

.rhf-button {
  align-self: flex-start;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 18px;
  padding: 4px 12px;
  cursor: pointer;
}

.rhf-button:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}

.rhf-button:disabled {
  color: var(--dsw-alias-label-dimmed);
  cursor: not-allowed;
}

.rhf-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
  outline-offset: 2px;
}

.rhf-rows {
  display: flex;
  flex-direction: column;
}

.rhf-row-block + .rhf-row-block {
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}

.rhf-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
}

.rhf-row-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rhf-row-name {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 20px;
}

.rhf-model-id {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
}

.rhf-row-error {
  margin: 0;
  padding: 0 16px 10px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}

.rhf-group-error {
  margin: 0;
  padding: 8px 16px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}

.rhf-muted {
  margin: 0;
  padding: 10px 16px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.rhf-empty {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}

.rhf-notice {
  margin: 0;
  padding: 10px 12px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
}

.rhf-error {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 0.5px solid var(--dsw-alias-state-error-primary);
  border-radius: var(--dsw-radius-md);
}

.rhf-error-text {
  margin: 0;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}

.rhf-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
`

export function injectStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  document.getElementById(STYLE_ID)?.remove()
  const element = document.createElement('style')
  element.id = STYLE_ID
  element.textContent = CSS
  document.head.append(element)
  return () => {
    if (element.isConnected) element.remove()
  }
}
