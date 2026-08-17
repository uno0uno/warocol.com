export const COLLECTIONS_WEBHOOK_PATH = '/collections/webhooks/wompi'

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
