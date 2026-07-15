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

interface PublicAttributionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const PUBLIC_OFFER = Object.freeze({
  annualPrice: 'COP 95.900/año',
  monthlyEquivalent: 'menos de COP 8.000/mes',
  trial: '15 días gratis, sin tarjeta',
  payment: 'El pago es opcional durante el trial.',
})

// Activate only after recording a verifiable source, date, scope and disclosure here.
export const PUBLIC_CTA_COMPARISON: PublicCtaComparison | null = null

const INTENT_LABELS: Record<PublicCtaIntent, string> = {
  pos: 'POS para restaurantes',
  pricing: 'Precio claro',
  costs: 'Costos e inventario',
  management: 'Administración conectada',
  team: 'Equipo y nómina',
}
const PUBLIC_CTA_INTENTS = new Set<PublicCtaIntent>(Object.keys(INTENT_LABELS) as PublicCtaIntent[])

const BENEFIT_COPY: Record<PublicCtaIntent, Pick<PublicCta, 'headline' | 'body'>> = {
  pos: {
    headline: 'Vende y controla tu restaurante desde un solo POS.',
    body: 'Gestiona caja, mesas, inventario, costos y facturas de proveedores con información conectada.',
  },
  pricing: {
    headline: 'Empieza con la operación completa, sin pagar por adelantado.',
    body: 'Prueba las funciones del Plan Pro durante 15 días y decide con el restaurante ya configurado.',
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

const FINAL_COPY: Record<PublicCtaIntent, Pick<PublicCta, 'headline' | 'body'>> = {
  pos: {
    headline: 'Prueba un POS creado para restaurantes colombianos.',
    body: `Vende, controla inventario y conoce tus costos con el Plan Pro por ${PUBLIC_OFFER.annualPrice}.`,
  },
  pricing: {
    headline: 'Prueba WARO antes de activar tu plan.',
    body: `Plan Pro por ${PUBLIC_OFFER.annualPrice}, equivalente a ${PUBLIC_OFFER.monthlyEquivalent}.`,
  },
  costs: {
    headline: 'Empieza a controlar costos e inventario con datos reales.',
    body: 'Crea tu cuenta, configura el negocio y prueba el flujo completo sin ingresar una tarjeta.',
  },
  management: {
    headline: 'Pon la operación de tu restaurante en orden.',
    body: 'Crea tu cuenta y prueba durante 15 días las herramientas para administrar el negocio.',
  },
  team: {
    headline: 'Gestiona la operación y el equipo con menos reprocesos.',
    body: 'Crea tu cuenta y prueba cómo WARO conecta la información diaria de tu restaurante.',
  },
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

export const getPublicCta = (intent: PublicCtaIntent, placement: PublicCtaPlacement): PublicCta => {
  const copy = placement === 'benefit'
    ? BENEFIT_COPY[intent]
    : placement === 'price'
      ? {
          headline: `Plan Pro por ${PUBLIC_OFFER.annualPrice}.`,
          body: `${PUBLIC_OFFER.monthlyEquivalent}, con acceso al Plan Pro durante la prueba.`,
        }
      : FINAL_COPY[intent]
  const button = placement === 'header'
    ? 'Probar gratis'
    : placement === 'final'
      ? 'Crear cuenta y probar'
      : 'Probar WARO gratis'

  return {
    eyebrow: INTENT_LABELS[intent],
    ...copy,
    button,
    microcopy: `${PUBLIC_OFFER.trial}. ${PUBLIC_OFFER.payment}`,
    campaign: 'self_service_trial',
    variant: `${intent}_${placement}_v1`,
    intent,
    placement,
    comparison: PUBLIC_CTA_COMPARISON ?? undefined,
  }
}

export const getBlogPublicCta = (slug: string, placement: Extract<PublicCtaPlacement, 'benefit' | 'price' | 'final'>) =>
  getPublicCta(resolveBlogCtaIntent(slug), placement)

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
