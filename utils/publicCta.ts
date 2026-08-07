import {
  resolveArticleMarket,
  type ArticleMarket,
  type ArticleMarketInput,
} from './articleMarket.ts'
import { sanitizeRegistrationAttribution, type RegistrationAttribution } from './registrationFlow.ts'
import { trackOnboardingEvent, type DataLayerTarget } from './onboardingAnalytics.ts'

export const PUBLIC_CTA_ATTRIBUTION_KEY = 'waro:public-cta:attribution:v1'

export type PublicCtaIntent = 'pos' | 'pricing' | 'costs' | 'management' | 'team'
export type PublicCtaPlacement = 'header' | 'hero' | 'benefit' | 'price' | 'final'

export interface PublicCtaComparison {
  source: string
  url: string
  asOf: string
  scope: string
  disclosure: string
}

export interface PublicCta {
  eyebrow: string
  headline: string
  body: string
  button: string
  microcopy: string
  campaign: string
  variant: string
  intent: PublicCtaIntent
  placement: PublicCtaPlacement
  comparison?: PublicCtaComparison
}

export interface PublicCtaTouch {
  source: string
  content: string
}

export interface PublicOffer {
  annualPrice: string
  monthlyEquivalent: string
  activation: string
}

interface PublicAttributionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Colombia ES public marketing offer (default). */
export const PUBLIC_OFFER: PublicOffer = Object.freeze({
  annualPrice: 'COP 95.900/año',
  monthlyEquivalent: 'menos de COP 8.000/mes',
  activation: 'El acceso a los módulos se activa después del pago.',
})

function toArticleMarket(marketInput: ArticleMarketInput | ArticleMarket = {}): ArticleMarket {
  if ('isUsEn' in marketInput && 'annualPriceLabel' in marketInput) {
    return marketInput as ArticleMarket
  }
  return resolveArticleMarket(marketInput)
}

/** Resolve public offer strings from article/public market input. Default → CO. */
export function resolvePublicOffer(marketInput: ArticleMarketInput | ArticleMarket = {}): PublicOffer {
  const market = toArticleMarket(marketInput)
  if (market.isUsEn) {
    return {
      annualPrice: market.annualPriceLabel,
      monthlyEquivalent: 'under USD $30/month',
      activation: 'Module access activates after payment.',
    }
  }
  return PUBLIC_OFFER
}

/** In-app Starter trial banner price slot (warocol.com#1917). */
export function resolveTrialPriceAnchor(options: {
  locale?: string | null
  countryCode?: string | null
  currencyCode?: string | null
} = {}): string {
  const isEn = String(options.locale || '').toLowerCase().startsWith('en')
  const country = String(options.countryCode || '').toUpperCase()
  const currency = String(options.currencyCode || '').toUpperCase()
  const isMexico = country === 'MX' || currency === 'MXN'
  const isUs = country === 'US' || currency === 'USD'

  if (isMexico) {
    // No approved MXN list price yet — avoid showing COP to MX tenants.
    return isEn ? 'Plan Pro' : 'el Plan Pro'
  }

  if (isUs) {
    return isEn ? 'under USD $30/month' : 'menos de USD $30/mes'
  }

  return isEn ? 'under COP 8,000/month' : PUBLIC_OFFER.monthlyEquivalent
}

// Activate only after recording a verifiable source, date, scope and disclosure here.
export const PUBLIC_CTA_COMPARISON: PublicCtaComparison | null = null

const INTENT_LABELS_ES: Record<PublicCtaIntent, string> = {
  pos: 'POS para restaurantes',
  pricing: 'Precio claro',
  costs: 'Costos e inventario',
  management: 'Administración conectada',
  team: 'Equipo y nómina',
}

const INTENT_LABELS_EN: Record<PublicCtaIntent, string> = {
  pos: 'Restaurant POS',
  pricing: 'Clear pricing',
  costs: 'Costs and inventory',
  management: 'Connected operations',
  team: 'Team and payroll',
}

const PUBLIC_CTA_INTENTS = new Set<PublicCtaIntent>(Object.keys(INTENT_LABELS_ES) as PublicCtaIntent[])

const BENEFIT_COPY_ES: Record<PublicCtaIntent, Pick<PublicCta, 'headline' | 'body'>> = {
  pos: {
    headline: 'Vende y controla tu restaurante desde un solo POS.',
    body: 'Gestiona caja, mesas, inventario, costos y facturas de proveedores con información conectada.',
  },
  pricing: {
    headline: 'Empieza con un precio claro desde el registro.',
    body: 'Crea tu cuenta, confirma los datos del negocio y elige el plan antes de activar los módulos.',
  },
  costs: {
    headline: 'Convierte compras e inventario en decisiones rentables.',
    body: 'Consulta costos por plato, existencias y márgenes sin depender de hojas de cálculo separadas.',
  },
  management: {
    headline: 'Ordena la operación del restaurante en un solo lugar.',
    body: 'Conecta ventas, mesas, domicilios, inventario y costos para trabajar con más control.',
  },
  team: {
    headline: 'Conecta turnos, ventas y propinas con tu equipo.',
    body: 'Reduce reprocesos de nómina y consulta la operación diaria desde la misma plataforma.',
  },
}

const BENEFIT_COPY_EN: Record<PublicCtaIntent, Pick<PublicCta, 'headline' | 'body'>> = {
  pos: {
    headline: 'Sell and control your restaurant from one POS.',
    body: 'Manage checkout, tables, inventory, costs, and supplier invoices with connected data.',
  },
  pricing: {
    headline: 'Start with clear pricing from signup.',
    body: 'Create your account, confirm your business details, and choose a plan before modules activate.',
  },
  costs: {
    headline: 'Turn purchases and inventory into profitable decisions.',
    body: 'See plate costs, stock, and margins without separate spreadsheets.',
  },
  management: {
    headline: 'Run restaurant operations in one place.',
    body: 'Connect sales, tables, delivery, inventory, and costs for more control.',
  },
  team: {
    headline: 'Connect shifts, sales, and tips with your team.',
    body: 'Cut payroll rework and review daily operations from the same platform.',
  },
}

function finalCopyEs(offer: PublicOffer): Record<PublicCtaIntent, Pick<PublicCta, 'headline' | 'body'>> {
  return {
    pos: {
      headline: 'Activa un POS creado para restaurantes colombianos.',
      body: `Vende, controla inventario y conoce tus costos con el Plan Pro por ${offer.annualPrice}.`,
    },
    pricing: {
      headline: 'Activa WARO con un plan anual claro.',
      body: `Plan Pro por ${offer.annualPrice}, equivalente a ${offer.monthlyEquivalent}.`,
    },
    costs: {
      headline: 'Empieza a controlar costos e inventario con datos reales.',
      body: 'Crea tu cuenta, confirma el negocio y elige el plan que activarás desde Billing.',
    },
    management: {
      headline: 'Pon la operación de tu restaurante en orden.',
      body: 'Crea tu cuenta y activa las herramientas para administrar el negocio desde un solo lugar.',
    },
    team: {
      headline: 'Gestiona la operación y el equipo con menos reprocesos.',
      body: 'Crea tu cuenta y activa WARO para conectar la información diaria de tu restaurante.',
    },
  }
}

function finalCopyEn(offer: PublicOffer): Record<PublicCtaIntent, Pick<PublicCta, 'headline' | 'body'>> {
  return {
    pos: {
      headline: 'Activate a POS built for restaurant operators.',
      body: `Sell, control inventory, and know your costs with Plan Pro for ${offer.annualPrice}.`,
    },
    pricing: {
      headline: 'Activate WARO with a clear annual plan.',
      body: `Plan Pro for ${offer.annualPrice}, equivalent to ${offer.monthlyEquivalent}.`,
    },
    costs: {
      headline: 'Start controlling costs and inventory with real data.',
      body: 'Create your account, confirm the business, and choose the plan you will activate from Billing.',
    },
    management: {
      headline: 'Get your restaurant operations in order.',
      body: 'Create your account and activate the tools to manage the business from one place.',
    },
    team: {
      headline: 'Run operations and your team with less rework.',
      body: 'Create your account and activate WARO to connect your restaurant\'s daily information.',
    },
  }
}

const normalizeAttributionValue = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .slice(0, 100)
  return normalized || fallback
}

export const resolveBlogCtaIntent = (slug: string): PublicCtaIntent => {
  const value = slug.toLocaleLowerCase()
  if (/nomina|liquidacion|desprendible|prima-de-servicios|mesero|brigada/.test(value)) return 'team'
  if (/precio|gratis|free|full|open-source|comparativa/.test(value)) return 'pricing'
  if (/food-cost|punto-de-equilibrio|arqueo|inventario|mise-en-place|costos/.test(value)) return 'costs'
  if (/software|pos|pdv|tpv|sistema-pos|contable/.test(value)) return 'pos'
  return 'management'
}

export const getPublicCta = (
  intent: PublicCtaIntent,
  placement: PublicCtaPlacement,
  marketInput: ArticleMarketInput | ArticleMarket = {},
): PublicCta => {
  const market = toArticleMarket(marketInput)
  const offer = resolvePublicOffer(market)
  const isEn = market.isUsEn

  const benefit = isEn ? BENEFIT_COPY_EN[intent] : BENEFIT_COPY_ES[intent]
  const finals = isEn ? finalCopyEn(offer) : finalCopyEs(offer)

  const copy = placement === 'benefit'
    ? benefit
    : placement === 'price'
      ? (isEn
          ? {
              headline: `Plan Pro for ${offer.annualPrice}.`,
              body: `${offer.monthlyEquivalent}; access unlocks after payment.`,
            }
          : {
              headline: `Plan Pro por ${offer.annualPrice}.`,
              body: `${offer.monthlyEquivalent}; el acceso se habilita después del pago.`,
            })
      : finals[intent]

  const button = placement === 'header'
    ? (isEn ? 'Create account' : 'Crear cuenta')
    : placement === 'final'
      ? (isEn ? 'Create account and choose a plan' : 'Crear cuenta y elegir plan')
      : (isEn ? 'Sign up for WARO' : 'Registrarme en WARO')

  return {
    eyebrow: (isEn ? INTENT_LABELS_EN : INTENT_LABELS_ES)[intent],
    ...copy,
    button,
    microcopy: `${offer.annualPrice}. ${offer.activation}`,
    campaign: 'self_service_paid',
    variant: `${intent}_${placement}_v1`,
    intent,
    placement,
    comparison: PUBLIC_CTA_COMPARISON ?? undefined,
  }
}

export const getBlogPublicCta = (
  slug: string,
  placement: Extract<PublicCtaPlacement, 'benefit' | 'price' | 'final'>,
  marketInput: ArticleMarketInput | ArticleMarket = {},
) => getPublicCta(resolveBlogCtaIntent(slug), placement, marketInput)

export const buildPublicCtaAttribution = (cta: PublicCta, touch: PublicCtaTouch): RegistrationAttribution =>
  sanitizeRegistrationAttribution({
    source: normalizeAttributionValue(touch.source, 'public'),
    content: normalizeAttributionValue(touch.content, cta.placement),
    campaign: cta.campaign,
    variant: cta.variant,
  })

export const buildPublicCtaRegistrationRoute = (cta: PublicCta, touch: PublicCtaTouch) => ({
  path: '/registro',
  query: buildPublicCtaAttribution(cta, touch),
})

export const writePublicCtaAttribution = (
  storage: PublicAttributionStorage,
  attribution: RegistrationAttribution,
) => {
  const safe = sanitizeRegistrationAttribution(attribution)
  storage.setItem(PUBLIC_CTA_ATTRIBUTION_KEY, JSON.stringify({ version: 1, attribution: safe }))
  return safe
}

export const writeVerifiedPublicCtaAttribution = (
  storage: PublicAttributionStorage,
  value: unknown,
) => {
  const safe = sanitizeRegistrationAttribution(
    value && typeof value === 'object' ? value as Record<string, unknown> : {},
  )
  if (Object.keys(safe).length > 0) writePublicCtaAttribution(storage, safe)
  return safe
}

export const readPublicCtaAttribution = (storage?: Pick<PublicAttributionStorage, 'getItem'> | null) => {
  if (!storage) return {}
  try {
    const parsed = JSON.parse(storage.getItem(PUBLIC_CTA_ATTRIBUTION_KEY) ?? '') as {
      version?: number
      attribution?: RegistrationAttribution
    }
    return parsed.version === 1 ? sanitizeRegistrationAttribution(parsed.attribution ?? {}) : {}
  } catch {
    return {}
  }
}

export const buildPublicCtaAnalyticsContext = (attribution: RegistrationAttribution) => {
  const safe = sanitizeRegistrationAttribution(attribution)
  const intent = safe.variant?.split('_')[0]
  return {
    ...safe,
    ...(intent && PUBLIC_CTA_INTENTS.has(intent as PublicCtaIntent) ? { intent } : {}),
  }
}

export const readPublicCtaAnalyticsContext = (storage?: Pick<PublicAttributionStorage, 'getItem'> | null) =>
  buildPublicCtaAnalyticsContext(readPublicCtaAttribution(storage))

export const activatePublicCta = (
  cta: PublicCta,
  touch: PublicCtaTouch,
  target?: DataLayerTarget | null,
  storage?: PublicAttributionStorage | null,
) => {
  const attribution = buildPublicCtaAttribution(cta, touch)
  trackOnboardingEvent('public_cta_clicked', {
    ...buildPublicCtaAnalyticsContext(attribution),
  }, target, null)
  if (storage) writePublicCtaAttribution(storage, attribution)
  return { path: '/registro', query: attribution }
}
