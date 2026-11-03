import type { ClientContext, Translate } from './contract'
import { en, fallbackTranslate, zh } from './copy'
import { HeaderFixStore, SETTINGS_NS } from './store'
import { injectStyles } from './styles'
import { Section } from './Section'

export const inject = ['slots', 'remote', 'remote.settings', 'remote.llm', 'remote.session'] as const

export function apply(ctx: ClientContext): void {
  const locale = ctx.get('locale')
  const t: Translate = locale === undefined ? fallbackTranslate() : locale.bind(SETTINGS_NS)
  if (locale !== undefined) ctx.effect(() => locale.register(SETTINGS_NS, { en, zh }), 'rhf: locale dictionaries')
  ctx.effect(() => injectStyles(), 'rhf: styles')

  const store = new HeaderFixStore(() => {
    const settings = ctx.get('remote.settings')
    const llm = ctx.get('remote.llm')
    const session = ctx.get('remote.session')
    const remote = ctx.get('remote')
    if (settings === undefined || llm === undefined || session === undefined) return null
    if (remote === undefined) return { settings, llm, session }
    return {
      settings,
      llm,
      session,
      on: (event: string, listener: () => void) => remote.$on(event, listener),
    }
  })

  ctx.effect(() => store.start(), 'rhf: document invalidation')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: SETTINGS_NS,
    order: 12,
    label: () => t('nav'),
    locale: SETTINGS_NS,
    inject: () => ({ t, store }),
  }, Section))
}
