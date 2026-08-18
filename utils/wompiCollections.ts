export const COLLECTIONS_WEBHOOK_PATH = '/collections/webhooks/wompi'
export const WOMPI_METHOD_NAME = 'Wompi'

export type PasarelaStatus = {
  fingerprint: string
  environment: string
  isActive: boolean
  paymentMethodId: string | null
}

export function collectionsWebhookUrl (apiOrigin: string): string {
  const origin = String(apiOrigin || '').trim().replace(/\/+$/, '')
  return `${origin}${COLLECTIONS_WEBHOOK_PATH}`
}

export function pasarelaEnvironmentLabelKey (environment: string | null | undefined): string {
  return environment === 'prod'
    ? 'integraciones.pasarela.envProd'
    : 'integraciones.pasarela.envTest'
}

export function isWompiPaymentMethod (
  method: { name?: string | null } | string | null | undefined,
): boolean {
  const name = typeof method === 'string' ? method : method?.name
  return String(name || '').trim().toLowerCase() === WOMPI_METHOD_NAME.toLowerCase()
}

function siteOrigin (siteOriginOrUrl: string): string {
  return String(siteOriginOrUrl || '').trim().replace(/\/+$/, '')
}

export function waroCollectionLandingUrl (origin: string, sessionId: string): string {
  return `${siteOrigin(origin)}/cobro/${sessionId}`
}

export function waroCollectionThankYouUrl (origin: string, sessionId: string): string {
  return `${siteOrigin(origin)}/cobro/${sessionId}/gracias`
}

export function isValidCollectionEmail (email: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export function ventasPaymentStatusIsUnpaid (status: string | null | undefined): boolean {
  return !status
}

export function collectionMailtoHref (email: string, landingUrl: string): string {
  const subject = encodeURIComponent('Paga tu cuenta en el restaurante')
  const body = encodeURIComponent(`Usa este enlace de WARO para pagar:\n${landingUrl}`)
  return `mailto:${String(email || '').trim()}?subject=${subject}&body=${body}`
}
