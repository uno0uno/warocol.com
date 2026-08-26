import {
  currencyFromCountry,
  localeFromCountry,
  PRIMARY_CURRENCY_BY_COUNTRY,
} from './countryLocale.ts'
import { normalizeEnabledAppLocale, toLocaleTag } from './appLocales.ts'

export type ArticleMarketCode = string

export interface ArticleMarketInput {
  lang?: string | null
  country?: string | null
  country_code?: string | null
}

export interface ArticleMarket {
  market: ArticleMarketCode
  localeTag: string
  ogLocale: string
  inLanguage: string
  currency: string
  annualPrice: string
  monthlyPrice: string
  annualPriceLabel: string
  monthlyOfferDescription: string
  isUsEn: boolean
  areaServedName: string
}

const LATAM_LABELS = new Set([
  'latam',
  'latin america',
  'latinoamerica',
  'latinoamérica',
  'américa latina',
  'america latina',
])

const NAME_ALIASES: Record<string, string> = {
  usa: 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  'united states': 'US',
  'united states of america': 'US',
  colombia: 'CO',
  col: 'CO',
  spain: 'ES',
  españa: 'ES',
  espana: 'ES',
  mexico: 'MX',
  méxico: 'MX',
  uk: 'GB',
}

const DISPLAY_NAMES: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  NZ: 'New Zealand',
  BR: 'Brazil',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  SG: 'Singapore',
  AE: 'United Arab Emirates',
  IN: 'India',
  CN: 'China',
  MX: 'Mexico',
  ES: 'Spain',
  CO: 'Colombia',
  CR: 'Costa Rica',
  UY: 'Uruguay',
  CL: 'Chile',
  PE: 'Peru',
  AR: 'Argentina',
  DO: 'Dominican Republic',
  PA: 'Panama',
}

const CO_MARKET: ArticleMarket = Object.freeze({
  market: 'CO',
  localeTag: 'es-CO',
  ogLocale: 'es_CO',
  inLanguage: 'es-CO',
  currency: 'COP',
  annualPrice: '95900',
  monthlyPrice: '7992',
  annualPriceLabel: 'COP 95.900/año',
  monthlyOfferDescription: 'Equivalente mensual del plan anual de $95.900 COP',
  isUsEn: false,
  areaServedName: 'Colombia',
})

const US_MARKET: ArticleMarket = Object.freeze({
  market: 'US',
  localeTag: 'en-US',
  ogLocale: 'en_US',
  inLanguage: 'en-US',
  currency: 'USD',
  annualPrice: '360',
  monthlyPrice: '30',
  annualPriceLabel: 'USD $30/month',
  monthlyOfferDescription: 'Monthly equivalent of the USD $30/month plan',
  isUsEn: true,
  areaServedName: 'United States',
})

/** ISO-2 from article.country / country_code. LATAM and unknown → null. */
export function normalizeArticleCountryCode(country?: string | null): string | null {
  const raw = String(country || '').trim()
  if (!raw) return null
  const folded = raw.toLowerCase()
  if (LATAM_LABELS.has(folded)) return null
  if (raw.length === 2) {
    const code = raw.toUpperCase()
    if (PRIMARY_CURRENCY_BY_COUNTRY[code]) return code
  }
  if (NAME_ALIASES[folded]) return NAME_ALIASES[folded]
  for (const [code, name] of Object.entries(DISPLAY_NAMES)) {
    if (name.toLowerCase() === folded) return code
  }
  return null
}

/** Legacy helper: US aliases → US, everything else (incl. LATAM) → CO. */
export function normalizeArticleCountry(country?: string | null): ArticleMarketCode {
  return normalizeArticleCountryCode(country) === 'US' ? 'US' : 'CO'
}

function localeTags(lang: string | null | undefined, countryCode: string) {
  const locale = normalizeEnabledAppLocale(lang) ?? localeFromCountry(countryCode)
  const localeTag = toLocaleTag(locale)
  const region = countryCode.length === 2 ? countryCode : 'CO'
  const language = localeTag.split('-')[0] || 'es'
  const tagged = `${language}-${region}`
  return {
    localeTag: tagged,
    ogLocale: tagged.replace('-', '_'),
    inLanguage: tagged,
  }
}

function marketFor(countryCode: string, lang?: string | null): ArticleMarket {
  const tags = localeTags(lang, countryCode)
  const currency = currencyFromCountry(countryCode)
  return {
    market: countryCode,
    ...tags,
    currency,
    annualPrice: countryCode === 'CO' ? CO_MARKET.annualPrice : countryCode === 'US' ? US_MARKET.annualPrice : '',
    monthlyPrice: countryCode === 'CO' ? CO_MARKET.monthlyPrice : countryCode === 'US' ? US_MARKET.monthlyPrice : '',
    annualPriceLabel: countryCode === 'CO' ? CO_MARKET.annualPriceLabel : countryCode === 'US' ? US_MARKET.annualPriceLabel : `${currency}`,
    monthlyOfferDescription: countryCode === 'CO'
      ? CO_MARKET.monthlyOfferDescription
      : countryCode === 'US'
        ? US_MARKET.monthlyOfferDescription
        : '',
    isUsEn: false,
    areaServedName: DISPLAY_NAMES[countryCode] || countryCode,
  }
}

/**
 * Article page: country_code + lang of the article (option A).
 * USD/EN freeze only when language is English and country is US.
 */
export function resolveArticleMarket(input: ArticleMarketInput = {}): ArticleMarket {
  const lang = String(input.lang || '').trim().toLowerCase()
  const isEn = lang === 'en' || lang.startsWith('en-') || lang.startsWith('en_')
  const countryCode = normalizeArticleCountryCode(input.country_code)
    ?? normalizeArticleCountryCode(input.country)

  if (isEn && countryCode === 'US') return US_MARKET
  if (!countryCode) return CO_MARKET
  if (countryCode === 'CO' && !isEn) return CO_MARKET
  return marketFor(countryCode, input.lang)
}

export interface AnonymousReaderInput {
  acceptLanguage?: string | null
  cfIpCountry?: string | null
}

function parseAcceptLanguage(header?: string | null): string | null {
  const first = String(header || '').split(',')[0]?.trim()
  if (!first) return null
  return first.split(';')[0]?.trim() || null
}

/** Blog home/list: geo + Accept-Language. No country → es + COP. */
export function resolveAnonymousReaderMarket(input: AnonymousReaderInput = {}): ArticleMarket {
  const geo = String(input.cfIpCountry || '').trim().toUpperCase()
  const geoCode = geo.length === 2 && PRIMARY_CURRENCY_BY_COUNTRY[geo] ? geo : null
  const lang = parseAcceptLanguage(input.acceptLanguage)
  if (!geoCode && !normalizeEnabledAppLocale(lang)) return CO_MARKET
  if (!geoCode) return CO_MARKET
  const resolved = marketFor(geoCode, lang)
  if (normalizeEnabledAppLocale(lang) === 'en' && geoCode === 'US') return US_MARKET
  return resolved
}
