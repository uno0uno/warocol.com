export type ArticleMarketCode = 'CO' | 'US'

export interface ArticleMarketInput {
  lang?: string | null
  country?: string | null
}

export interface ArticleMarket {
  market: ArticleMarketCode
  localeTag: string
  ogLocale: string
  inLanguage: string
  currency: 'COP' | 'USD'
  annualPrice: string
  monthlyPrice: string
  annualPriceLabel: string
  monthlyOfferDescription: string
  isUsEn: boolean
  areaServedName: string
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
  annualPrice: '300',
  monthlyPrice: '25',
  annualPriceLabel: 'USD $300/year',
  monthlyOfferDescription: 'Monthly equivalent of the USD $300/year plan',
  isUsEn: true,
  areaServedName: 'United States',
})

/** Normalize free-text article.country to a market code. Unknown → CO (current DB default). */
export function normalizeArticleCountry(country?: string | null): ArticleMarketCode {
  const raw = String(country || '').trim().toLowerCase()
  if (!raw) return 'CO'

  if (
    raw === 'us'
    || raw === 'usa'
    || raw === 'united states'
    || raw === 'united states of america'
    || raw === 'u.s.'
    || raw === 'u.s.a.'
  ) {
    return 'US'
  }

  if (raw === 'co' || raw === 'colombia' || raw === 'col') {
    return 'CO'
  }

  return 'CO'
}

/**
 * Resolve marketing/SEO market from article.lang + article.country.
 * USD/EN surfaces only when language is English and country maps to US.
 */
export function resolveArticleMarket(input: ArticleMarketInput = {}): ArticleMarket {
  const lang = String(input.lang || '').trim().toLowerCase()
  const isEn = lang === 'en' || lang.startsWith('en-') || lang.startsWith('en_')
  const country = normalizeArticleCountry(input.country)

  if (isEn && country === 'US') {
    return US_MARKET
  }

  return CO_MARKET
}
