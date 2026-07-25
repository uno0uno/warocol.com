import { resolveBlogCtaIntent } from './publicCta.ts'

export type BlogLeadCtaPlacement = 'benefit' | 'price' | 'final'

export interface BlogLeadCtaContent {
  headline: string
  body: string
  button: string
  microcopy: string
}

const LEAD_MICROCOPY = '2 minutos. Sin tarjeta. Un asesor te contacta.'

const COMMERCIAL_PRICE = {
  headline: 'Plan Pro anual desde COP 95.900.',
  body: 'POS, inventario, costos por plato y escaneo inteligente de facturas. Sin permanencia.',
  button: 'Ver mis opciones',
}

function isCommercialSlug(slug: string): boolean {
  const intent = resolveBlogCtaIntent(slug)
  return intent === 'pos' || intent === 'pricing'
}

function copyForSlug(slug: string): Pick<BlogLeadCtaContent, 'headline' | 'body' | 'button'> {
  const s = slug.toLocaleLowerCase()

  if (/nomina|liquidacion|desprendible|prima-de-servicios|mesero|brigada/.test(s)) {
    return {
      headline: 'Evita errores de nómina antes de que cuesten plata.',
      body: 'WARO conecta turnos, ventas, propinas e inventario para que controles la operación completa del restaurante desde un solo lugar.',
      button: 'Ver cómo funciona',
    }
  }

  if (/precio|gratis|free|full|open-source|comparativa/.test(s)) {
    return {
      headline: COMMERCIAL_PRICE.headline,
      body: COMMERCIAL_PRICE.body,
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
      headline: 'POS para restaurantes desde COP 95.900 al año.',
      body: 'Vende, controla mesas, inventario, costos y facturas de proveedores con IA. Hecho en Colombia para restaurantes colombianos.',
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
    body: 'POS, inventario, costos por plato y escaneo inteligente de facturas desde COP 95.900 al año.',
    button: 'Comenzar gratis',
  }
}

export function getBlogLeadCta(slug: string, placement: BlogLeadCtaPlacement = 'final'): BlogLeadCtaContent {
  const base = copyForSlug(slug)

  if (placement === 'price' && isCommercialSlug(slug)) {
    return {
      ...COMMERCIAL_PRICE,
      microcopy: LEAD_MICROCOPY,
    }
  }

  return {
    ...base,
    microcopy: LEAD_MICROCOPY,
  }
}

export function blogLeadSource(slug: string): string {
  return `blog:${slug}`
}
