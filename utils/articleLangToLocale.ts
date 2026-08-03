import {
  normalizeEnabledAppLocale,
  type AppLocaleCode,
} from './appLocales.ts'

/**
 * Map blog article.lang to an enabled app UI locale.
 * Returns null when missing/unsupported so callers do not overwrite waro_locale.
 */
export function articleLangToLocale(lang?: string | null): AppLocaleCode | null {
  return normalizeEnabledAppLocale(lang)
}
