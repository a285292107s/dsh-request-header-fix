export function readSelectedModels(config: unknown): Record<string, readonly string[]> {
  const field = isRecord(config) ? config['headerFix'] : undefined
  const getter = isRecord(field) ? field['get'] : undefined
  const live = typeof getter === 'function' ? Reflect.apply(getter, field, []) : field
  if (!isRecord(live)) return {}
  const selected: Record<string, readonly string[]> = {}
  for (const [provider, models] of Object.entries(live)) {
    if (!Array.isArray(models)) continue
    selected[provider] = models.filter((model): model is string => typeof model === 'string')
  }
  return selected
}

export function isModelSelected(selection: Record<string, readonly string[]>, provider: string, model: string): boolean {
  const models = selection[provider]
  return models !== undefined && models.includes(model)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
