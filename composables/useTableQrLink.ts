import QRCode from 'qrcode'
import { usePublicSiteUrl, usePublicStorefrontSlug } from '~/composables/usePublicSiteUrl'

/**
 * Table QR public link helpers (warocol.com#711).
 * Token must come from the API — never derived in the browser.
 *
 * Slug: tenant_public_profiles.slug via usePublicStorefrontSlug (same as /negocio).
 * Base URL: NUXT_PUBLIC_SITE_URL via usePublicSiteUrl (never window.location.origin).
 */
export function useTableQrLink() {
  const { siteUrl } = usePublicSiteUrl()
  const { publicSlug } = usePublicStorefrontSlug()
  const toast = useToast()

  const linkBase = computed(() => siteUrl.value)

  const buildTableQrUrl = (token: string | null | undefined): string | null => {
    const slug = publicSlug.value
    if (!token || !slug) return null
    return `${linkBase.value}/${slug}/mesa/${token}`
  }

  const copyTableQrLink = async (token: string | null | undefined) => {
    const url = buildTableQrUrl(token)
    if (!url) {
      toast.error('Activa el QR de la mesa primero', { title: 'Sin enlace' })
      return
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      toast.success('Enlace copiado al portapapeles', { title: 'Copiado' })
    } catch {
      toast.error('No se pudo copiar el enlace', { title: 'Error' })
    }
  }

  const downloadTableQrPng = async (
    token: string | null | undefined,
    tableName: string,
  ) => {
    const url = buildTableQrUrl(token)
    if (!url) {
      toast.error('Activa el QR de la mesa primero', { title: 'Sin enlace' })
      return
    }
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 })
      const anchor = document.createElement('a')
      const safeName = tableName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'mesa'
      anchor.href = dataUrl
      anchor.download = `qr-${safeName}.png`
      anchor.click()
      toast.success('Imagen QR descargada', { title: 'Listo' })
    } catch {
      toast.error('No se pudo generar el código QR', { title: 'Error' })
    }
  }

  return { buildTableQrUrl, copyTableQrLink, downloadTableQrPng, publicSlug, linkBase }
}
