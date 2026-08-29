import {
  resolveArticleMarket,
  type ArticleMarket,
  type ArticleMarketInput,
} from './articleMarket.ts'
import { resolveBlogCtaIntent } from './publicCta.ts'

export type BlogLeadCtaPlacement = 'benefit' | 'price' | 'final'

export interface BlogLeadCtaContent {
  headline: string
  body: string
  button: string
  microcopy: string
}

const LEAD_MICROCOPY_ES = '2 minutos. Sin tarjeta. Un asesor te contacta.'
const LEAD_MICROCOPY_EN = '2 minutes. No card required. An advisor will contact you.'

function commercialPriceEs(annualPriceLabel: string) {
  // Monthly-only markets (CO / LATAM usd_9): no "anual".
  const isMonthly = /\/mes$|\/month$/i.test(annualPriceLabel)
  return {
    headline: isMonthly
      ? `Plan Pro desde ${annualPriceLabel}.`
      : `Plan Pro anual desde ${annualPriceLabel.replace(/\/año$/, '')}.`,
    body: 'POS, inventario, costos por plato y escaneo inteligente de facturas. Sin permanencia.',
    button: 'Ver mis opciones',
  }
}

function commercialPriceEn(annualPriceLabel: string) {
  return {
    headline: `Pro plan from ${annualPriceLabel}.`,
    body: 'POS, inventory, plate-level food cost, and smart invoice scanning. No lock-in.',
    button: 'See my options',
  }
}

function isCommercialSlug(slug: string): boolean {
  const intent = resolveBlogCtaIntent(slug)
  return intent === 'pos' || intent === 'pricing'
}

function copyForSlugEs(
  slug: string,
  annualPriceLabel: string,
  marketCode?: string,
): Pick<BlogLeadCtaContent, 'headline' | 'body' | 'button'> {
  const s = slug.toLocaleLowerCase()
  const commercial = commercialPriceEs(annualPriceLabel)

  if (/nomina|liquidacion|desprendible|prima-de-servicios|mesero|brigada/.test(s)) {
    return {
      headline: 'Evita errores de nómina antes de que cuesten plata.',
      body: 'WARO conecta turnos, ventas, propinas e inventario para que controles la operación completa del restaurante desde un solo lugar.',
      button: 'Ver cómo funciona',
    }
  }

  if (/precio|gratis|free|full|open-source|comparativa/.test(s)) {
    return {
      headline: commercial.headline,
      body: commercial.body,
      button: 'Ver mis opciones',
    }
  }

  if (/food-cost|punto-de-equilibrio|arqueo|inventario|mise-en-place|costos/.test(s)) {
    return {
      headline: 'Deja de perder plata calculando en Excel.',
      body: 'WARO te muestra costos, inventario y rentabilidad por plato en tiempo real para decidir con datos, no con intuición.',
      button: 'Quiero ver cómo funciona',
    }
  }

  if (/software|pos|pdv|tpv|sistema-pos|contable/.test(s)) {
    return {
      headline: `POS para restaurantes desde ${annualPriceLabel}.`,
      body: marketCode === 'CO'
        ? 'Vende, controla mesas, inventario, costos y facturas de proveedores con IA. Hecho en Colombia para restaurantes colombianos.'
        : 'Vende, controla mesas, inventario, costos y facturas de proveedores con IA.',
      button: 'Ver demostración',
    }
  }

  if (/administrar|ingenieria-de-menu|cocinas|corrientazo|gastrobar|nombres/.test(s)) {
    return {
      headline: 'Ordena tu restaurante sin llenar más hojas de cálculo.',
      body: 'WARO conecta caja, inventario, costos, mesas y domicilios en un panel simple para operar con más control.',
      button: 'Quiero mi demo gratis',
    }
  }

  return {
    headline: 'Controla tu restaurante con WARO.',
    body: `POS, inventario, costos por plato y escaneo inteligente de facturas desde ${annualPriceLabel}.`,
    button: 'Comenzar gratis',
  }
}

function copyForSlugEn(
  slug: string,
  annualPriceLabel: string,
): Pick<BlogLeadCtaContent, 'headline' | 'body' | 'button'> {
  const s = slug.toLocaleLowerCase()
  const commercial = commercialPriceEn(annualPriceLabel)

  if (/nomina|liquidacion|desprendible|prima-de-servicios|mesero|brigada|payroll|tip/.test(s)) {
    return {
      headline: 'Stop payroll mistakes before they cost you.',
      body: 'WARO connects shifts, sales, tips, and inventory so you can run the full restaurant operation from one place.',
      button: 'See how it works',
    }
  }

  if (/precio|gratis|free|full|open-source|comparativa|price|pricing/.test(s)) {
    return {
      headline: commercial.headline,
      body: commercial.body,
      button: 'See my options',
    }
  }

  if (/food-cost|punto-de-equilibrio|arqueo|inventario|mise-en-place|costos|inventory|cost/.test(s)) {
    return {
      headline: 'Stop losing money to spreadsheet food cost.',
      body: 'WARO shows plate costs, inventory, and margins in real time so you decide with data, not guesswork.',
      button: 'I want to see how it works',
    }
  }

  if (/software|pos|pdv|tpv|sistema-pos|contable/.test(s)) {
    return {
      headline: `Restaurant POS from ${annualPriceLabel}.`,
      body: 'Sell, manage tables, inventory, costs, and supplier invoices with AI — built for restaurant operators.',
      button: 'See a demo',
    }
  }

  if (/administrar|ingenieria-de-menu|cocinas|corrientazo|gastrobar|nombres|manage|menu/.test(s)) {
    return {
      headline: 'Run your restaurant without more spreadsheets.',
      body: 'WARO connects POS, inventory, costs, tables, and delivery in one simple panel.',
      button: 'Get my free demo',
    }
  }

  return {
    headline: 'Run your restaurant with WARO.',
    body: `POS, inventory, plate-level food cost, and smart invoice scanning from ${annualPriceLabel}.`,
    button: 'Start free',
  }
}

export function getBlogLeadCta(
  slug: string,
  placement: BlogLeadCtaPlacement = 'final',
  marketInput: ArticleMarketInput | ArticleMarket = {},
): BlogLeadCtaContent {
  const market = 'isUsEn' in marketInput && 'annualPriceLabel' in marketInput
    ? marketInput as ArticleMarket
    : resolveArticleMarket(marketInput)

  const base = market.isUsEn
    ? copyForSlugEn(slug, market.annualPriceLabel)
    : copyForSlugEs(slug, market.annualPriceLabel, market.market)

  const microcopy = market.isUsEn ? LEAD_MICROCOPY_EN : LEAD_MICROCOPY_ES
  const commercial = market.isUsEn
    ? commercialPriceEn(market.annualPriceLabel)
    : commercialPriceEs(market.annualPriceLabel)

  if (placement === 'price' && isCommercialSlug(slug)) {
    return {
      ...commercial,
      microcopy,
    }
  }

  return {
    ...base,
    microcopy,
  }
}

export function blogLeadSource(slug: string): string {
  return `blog:${slug}`
}
