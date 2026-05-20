import QRCode from 'qrcode'

/**
 * Table QR public link helpers (warocol.com#711).
 * Token must come from the API — never derived in the browser.
 * URLs use the public storefront slug (tenant_public_profiles), not internal tenant.slug.
 */
export function useTableQrLink() {
  const config = useRuntimeConfig()
  const { currentTenant } = useTenantReactive()
  const toast = useToast()

  const { data: opsContext } = useQuery({
    key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
    query: () =>
      $fetch<{ success: boolean; data: { slug?: string } }>('/api/operaciones/restaurant-context'),
    enabled: () => !!currentTenant.value?.id,
    staleTime: 60_000,
  })

  const storefrontSlug = computed(
    () => opsContext.value?.data?.slug || currentTenant.value?.slug || null,
  )

  const buildTableQrUrl = (token: string | null | undefined): string | null => {
    const slug = storefrontSlug.value
    if (!token || !slug) return null
    const base = String(config.public.siteUrl || 'https://warocol.com').replace(/\/$/, '')
    return `${base}/${slug}/mesa/${token}`
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

  return { buildTableQrUrl, copyTableQrLink, downloadTableQrPng, storefrontSlug }
}
