import { arSA, de, enUS, es, fr, hi, ptBR, zhCN, type Locale } from 'date-fns/locale'
import { DEFAULT_APP_LOCALE, normalizeAppLocale, type AppLocaleCode } from './appLocales.ts'

const DATE_FNS_LOCALES: Record<AppLocaleCode, Locale> = {
  es,
  en: enUS,
  pt: ptBR,
  fr,
  de,
  ar: arSA,
  hi,
  zh: zhCN,
}

export function toDateFnsLocale(value: unknown): Locale {
  return DATE_FNS_LOCALES[normalizeAppLocale(value) ?? DEFAULT_APP_LOCALE]
}
