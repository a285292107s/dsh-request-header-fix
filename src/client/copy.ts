import type { Translate } from './contract'

const en = {
  nav: 'Request header fix',
  title: 'Request header fix',
  description: 'Selected models attach x-opencode-session to their requests, carrying the current session ID. Useful for relays that forward to OpenCode.',
  searchPlaceholder: 'Search providers or models',
  searchLabel: 'Search providers or models',
  loading: 'Loading…',
  loadFailed: 'Failed to load: ',
  unavailable: 'Settings service is unavailable.',
  hostMissing: 'Host half is not loaded. Restart dsh web.',
  empty: 'No model providers have been added yet.',
  noResults: 'No matching providers or models.',
  readonlyHint: 'Settings are read-only, so the switches cannot be changed.',
  selectedCount: 'Selected {selected} / {total}',
  selectAll: 'Select all',
  clear: 'Clear',
  toggleProvider: 'Expand or collapse {provider}',
  noModels: 'No models available right now',
  providerFailed: 'Model catalog failed to load: {message}',
  writeFailed: 'Write failed: ',
  retry: 'Retry',
  switchLabel: 'Attach the session ID header for {model}',
}

const zh: Record<keyof typeof en, string> = {
  nav: '请求头修正',
  title: '请求头修正',
  description: '勾选的模型会在请求中附加 x-opencode-session，值为当前会话 ID。适用于会转发到 OpenCode 的中转站。',
  searchPlaceholder: '搜索提供商或模型',
  searchLabel: '搜索提供商或模型',
  loading: '加载中…',
  loadFailed: '加载失败：',
  unavailable: '设置服务不可用。',
  hostMissing: '宿主半边未加载，请重启 dsh web',
  empty: '还没有已添加的模型提供商。',
  noResults: '没有匹配的提供商或模型。',
  readonlyHint: '当前设置是只读的，无法修改开关。',
  selectedCount: '已选 {selected} / {total}',
  selectAll: '全选',
  clear: '清空',
  toggleProvider: '展开或收起 {provider}',
  noModels: '当前没有可用模型',
  providerFailed: '模型目录加载失败：{message}',
  writeFailed: '写入失败：',
  retry: '重试',
  switchLabel: '为 {model} 附加会话 ID 请求头',
}

export { en, zh }

export function interpolate(template: string, params?: Record<string, string>): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match)
}

export function fallbackTranslate(): Translate {
  return (key, params) => {
    const dictionary: Record<string, string> = activeLocale() === 'zh' ? zh : en
    return interpolate(dictionary[key] ?? key, params)
  }
}

function activeLocale(): 'zh' | 'en' {
  if (typeof document === 'undefined') return 'en'
  return document.documentElement.lang.trim().toLowerCase().startsWith('zh') ? 'zh' : 'en'
}
