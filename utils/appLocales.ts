export const LOCALE_MESSAGE_FILES = [
  'shell.json',
  'common.json',
  'pos.json',
  'operaciones.json',
  'cocina.json',
  'ventas.json',
  'despacho.json',
  'facturacion.json',
  'abastecimiento.json',
  'menu.json',
  'finanzas.json',
  'analitica.json',
  'crm.json',
  'equipo.json',
  'perfil.json',
  'docs.json',
  'blog.json',
] as const

export const APP_LOCALE_DEFINITIONS = [
  { code: 'es', language: 'es-CO', numberLanguage: 'es-CO', name: 'Español', direction: 'ltr', enabled: true },
  { code: 'en', language: 'en-US', numberLanguage: 'en-US', name: 'English', direction: 'ltr', enabled: true },
  { code: 'pt', language: 'pt-BR', numberLanguage: 'pt-BR', name: 'Português', direction: 'ltr', enabled: true },
  { code: 'fr', language: 'fr-FR', numberLanguage: 'fr-FR', name: 'Français', direction: 'ltr', enabled: true },
  { code: 'de', language: 'de-DE', numberLanguage: 'de-DE', name: 'Deutsch', direction: 'ltr', enabled: true },
  { code: 'hi', language: 'hi-IN', numberLanguage: 'hi-IN', name: 'हिन्दी', direction: 'ltr', enabled: true },
  { code: 'zh', language: 'zh-CN', numberLanguage: 'zh-CN', name: '简体中文', direction: 'ltr', enabled: true },
  // Keep Latin digits for operational POS input during the first Arabic rollout.
  { code: 'ar', language: 'ar', numberLanguage: 'ar-u-nu-latn', name: 'العربية', direction: 'rtl', enabled: true },
] as const

export type AppLocaleDefinition = (typeof APP_LOCALE_DEFINITIONS)[number]
export type AppLocaleCode = AppLocaleDefinition['code']
export type AppLocaleDirection = AppLocaleDefinition['direction']

export const DEFAULT_APP_LOCALE: AppLocaleCode = 'es'

export const ALL_APP_LOCALES = APP_LOCALE_DEFINITIONS.map(({ code }) => code) as readonly AppLocaleCode[]
export const APP_LOCALES = APP_LOCALE_DEFINITIONS
  .filter(({ enabled }) => enabled)
  .map(({ code }) => code) as readonly AppLocaleCode[]

const BY_CODE = new Map<AppLocaleCode, AppLocaleDefinition>(
  APP_LOCALE_DEFINITIONS.map(definition => [definition.code, definition]),
)

export function normalizeAppLocale(value: unknown): AppLocaleCode | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toLowerCase().replace(/_/g, '-').split('-', 1)[0] as AppLocaleCode
  return BY_CODE.has(code) ? code : null
}

export function isAppLocaleEnabled(value: unknown): value is AppLocaleCode {
  const code = normalizeAppLocale(value)
  return code !== null && BY_CODE.get(code)?.enabled === true
}

export function normalizeEnabledAppLocale(value: unknown): AppLocaleCode | null {
  const code = normalizeAppLocale(value)
  return code && isAppLocaleEnabled(code) ? code : null
}

export interface AppLocaleSources {
  profileValue?: unknown
  tenantValue?: unknown
  cookieValue?: unknown
  profileLoaded?: boolean
  tenantLoaded?: boolean
}

export function resolveAppLocale({
  profileValue,
  tenantValue,
  cookieValue,
  profileLoaded = false,
  tenantLoaded = false,
}: AppLocaleSources): AppLocaleCode {
  const profileLocale = normalizeEnabledAppLocale(profileValue)
  if (profileLoaded && profileLocale) return profileLocale

  if (profileLoaded && tenantLoaded) {
    return normalizeEnabledAppLocale(tenantValue) ?? DEFAULT_APP_LOCALE
  }

  // Until both authenticated sources are known, preserve the validated SSR
  // cache so hydration does not briefly fall back to another language.
  return normalizeEnabledAppLocale(cookieValue) ?? DEFAULT_APP_LOCALE
}

export function getAppLocaleDefinition(locale: AppLocaleCode): AppLocaleDefinition {
  return BY_CODE.get(locale) ?? BY_CODE.get(DEFAULT_APP_LOCALE)!
}

export function toLocaleTag(value: unknown): string {
  const code = normalizeAppLocale(value) ?? DEFAULT_APP_LOCALE
  return getAppLocaleDefinition(code).language
}

export function toNumberLocaleTag(value: unknown): string {
  const code = normalizeAppLocale(value) ?? DEFAULT_APP_LOCALE
  return getAppLocaleDefinition(code).numberLanguage
}

export function getLocaleDirection(value: unknown): AppLocaleDirection {
  const code = normalizeAppLocale(value) ?? DEFAULT_APP_LOCALE
  return getAppLocaleDefinition(code).direction
}

export function localeMessageFiles(code: AppLocaleCode): string[] {
  return LOCALE_MESSAGE_FILES.map(file => `${code}/${file}`)
}
