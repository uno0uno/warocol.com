<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, nextTick, watch } from 'vue'
import QRCode from 'qrcode'
import { useQueryCache } from '@pinia/colada'
import { useFormatters } from '~/composables/useFormatters'
import { formatPromoTypeLabel } from '~/utils/promotionPreview'
import { mergePosPaymentGroupsFromApi, type ApiPaymentGroup } from '~/utils/paymentDefaults'

definePageMeta({ layout: 'dashboard', module: 'ventas' })

useHead({ title: () => t('ventas.head.detail') })

// Tenant reactivity
const { currentTenant, businessProfile } = useTenantReactive()
const { singular: tableSingular } = useTableLabel()
const {
  receiptPrintSettings,
  receiptLogoUrl,
  settingsData,
} = useReceiptPrintSettings()
const queryCache = useQueryCache()

// Payment groups for label resolution and method buttons
const { data: paymentGroupsData } = useQuery({
  key: () => ['payments', 'pos-methods', currentTenant.value?.id ?? null],
  query: () => $fetch<{ success: boolean; data: ApiPaymentGroup[] }>('/api/pos/payment-methods'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
const paymentGroups = computed(() => mergePosPaymentGroupsFromApi(paymentGroupsData.value?.data ?? []))
const { resolveLabel } = usePaymentLabel(paymentGroups)

const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.params.id as string)

// Split payments slide-over
const showSplitPaymentsPanel = ref(false)

// Edit mode state
const isEditMode = ref(false)
const isSaving = ref(false)
const itemsToDelete = ref<Set<string>>(new Set())
const modifiersToDelete = ref<Map<string, Set<string>>>(new Map())
const productFilter = ref('')

// Status update (mesa orders)
const isUpdatingStatus = ref(false)
const selectedNewStatus = ref('')
const selectedPaymentMethod = ref('')
const selectedPaymentMethodId = ref<string | null>(null)
const showFinalizeSalePanel = ref(false)
const isFinalizingSale = ref(false)
const finalizeSaleError = ref('')
const finalizeSelectedGroup = computed(() =>
  paymentGroups.value.find(group => group.slug === selectedPaymentMethod.value) ?? null
)
const finalizeRequiresMethodSelection = computed(() =>
  (finalizeSelectedGroup.value?.methods?.length ?? 0) > 0 && !selectedPaymentMethodId.value
)
const finalizePaymentSelection = computed({
  get: () => ({
    slug: selectedPaymentMethod.value,
    id: selectedPaymentMethodId.value,
  }),
  set: (selection: { slug: string; id: string | null }) => {
    selectedPaymentMethod.value = selection.slug
    selectedPaymentMethodId.value = selection.id
    finalizeSaleError.value = ''
  },
})

// Load order details
const { data: orderData, status: orderStatus, asyncStatus: orderAsyncStatus, error: fetchError, refetch: refetchOrder } = useQuery({
  key: () => ['orders', currentTenant.value?.id ?? null, orderId.value],
  query: async () => {
    const response = await $fetch(`/api/orders/${orderId.value}`) as any
    return response.data
  },
  enabled: () => !!currentTenant.value && !!orderId.value,
  staleTime: 60_000,
})

// Load order items
const { data: itemsData, status: itemsStatus, asyncStatus: itemsAsyncStatus, refetch: refetchItems } = useQuery({
  key: () => ['orders', currentTenant.value?.id ?? null, orderId.value, 'items'],
  query: async () => {
    const response = await $fetch(`/api/orders/${orderId.value}/items`) as any
    return response.data
  },
  enabled: () => !!currentTenant.value && !!orderId.value,
  staleTime: 60_000,
})

// Load invoice for this order (404 = no invoice, not an error).
// Browser still logs GET 404 until no FE exists — expected, not a failed emit.
const invoiceQueryKey = () =>
  ['order-invoice', currentTenant.value?.id ?? null, orderId.value] as const

const { data: invoiceQueryData, status: invoiceStatus, refetch: refetchInvoice } = useQuery({
  key: invoiceQueryKey,
  query: async () => {
    try {
      return await $fetch(`/api/orders/${orderId.value}/invoice`) as any
    } catch (e: any) {
      if (e.status === 404 || e.statusCode === 404) return null
      throw e
    }
  },
  enabled: () => !!currentTenant.value && !!orderId.value,
  staleTime: 0,
})

/**
 * Local override: Pinia Colada setQueryData/refetch was unreliable after emit when
 * the query had just cached null from 404 (worse after PATCH customer + refetch).
 * Snapshot wins until a successful query result arrives.
 */
const invoiceSnapshot = ref<any>(null)
watch(orderId, () => { invoiceSnapshot.value = null })
watch(
  invoiceQueryData,
  (value) => {
    if (value) invoiceSnapshot.value = value
  },
  { immediate: true },
)
const invoiceData = computed(() => invoiceSnapshot.value ?? invoiceQueryData.value ?? null)

// DIAN invoicing readiness — read from the POS restaurant-context aggregator.
// /api/api/tenant/invoicing-readiness (the richer detail) is owner-only MI_NEGOCIO;
// this page is cashier-accessible, so we use the POS-gated boolean instead.
const isInvoicingReady = computed(() => settingsData.value?.data?.invoicing_ready === true)
const isReadinessLoading = computed(() => !settingsData.value)
const fiscalData = computed(() => settingsData.value?.data?.fiscal_data ?? null)
const platformLegal = computed(() => settingsData.value?.data?.platform_legal ?? null)
/** When false, Matias PDF is not expected (INVOICE_PDF_ENABLED). */
const invoicePdfEnabled = computed(() => settingsData.value?.data?.invoice_pdf_enabled === true)
const invoicePdfAvailable = computed(() =>
  invoiceData.value?.status === 'accepted'
  && invoicePdfEnabled.value
  && !!invoiceData.value?.pdf_presigned_url,
)

// Invoice emit state
const isEmittingInvoice = ref(false)
const emitInvoiceError = ref('')
const copiedCufe = ref(false)
const invoiceQrDataUrl = ref('')

// warocol.com#598 — invoice email modal trigger
const showEmailModal = ref(false)
const toast = useToast()
const onInvoiceEmailSent = (email: string) => {
  toast.success(t('ventas.detail.emailSent', { email }), { title: t('ventas.detail.emailSentTitle') })
}

type SelectedCustomer = {
  id: string
  name: string | null
  phone_number: string | null
  email: string | null
}

const showCustomerModal = ref(false)
const isAssociatingCustomer = ref(false)
const customerAssociationError = ref('')

// warocol.com#589 — detect the "ya validado" un-recoverable case so the UI
// shows a clearer support-action banner instead of dumping the raw Matias
// error and confusing the cashier into clicking emit again.
const isUnrecoverableRejection = computed(() => {
  if (!invoiceData.value || invoiceData.value.status !== 'rejected') return false
  const msg = (invoiceData.value.error_message || '').toLowerCase()
  return msg.includes('ya se encuentra validado')
})

const isCreditOnlyInvoiceBlocked = computed(() => {
  const o = orderData.value
  if (!o) return false
  return o.payment_method === 'credit'
    && ((o.split_payments ?? []).length === 0)
})

const canRetryInvoice = computed(() =>
  invoiceData.value?.status === 'rejected'
    && !isUnrecoverableRejection.value
    && !isCreditOnlyInvoiceBlocked.value,
)

const isMatiasAuthInvoiceError = computed(() => {
  const msg = (invoiceData.value?.error_message || emitInvoiceError.value || '').toLowerCase()
  return msg.includes('401') || msg.includes('unauthenticated')
})

const emitInvoice = async () => {
  if (isEmittingInvoice.value) return
  if (isCreditOnlyInvoiceBlocked.value) {
    emitInvoiceError.value = t('ventas.detail.creditOnlyNoEmit')
    return
  }
  isEmittingInvoice.value = true
  emitInvoiceError.value = ''
  try {
    const result = await $fetch(`/api/orders/${orderId.value}/invoice`, { method: 'POST' }) as {
      status?: string
      error_message?: string
      prefix?: string
      invoice_number?: number
      cufe?: string | null
      pdf_presigned_url?: string | null
      emitted_at?: string | null
      pdf_enabled?: boolean
      dian_url?: string | null
      attachments?: { pdf?: boolean; xml?: boolean }
    }

    // Always paint UI from POST first (does not depend on Pinia Colada).
    if (result?.status === 'accepted' || result?.status === 'rejected') {
      const seed = {
        order_id: orderId.value,
        status: result.status,
        prefix: result.prefix,
        invoice_number: result.invoice_number,
        cufe: result.cufe ?? null,
        pdf_presigned_url: result.pdf_presigned_url ?? null,
        error_message: result.error_message ?? null,
        emitted_at: result.emitted_at ?? new Date().toISOString(),
        pdf_enabled: result.pdf_enabled,
        dian_url: result.dian_url ?? null,
        attachments: result.attachments ?? { pdf: false, xml: false },
      }
      invoiceSnapshot.value = seed
      try {
        queryCache.setQueryData(invoiceQueryKey(), seed)
      } catch {
        /* ignore cache key mismatches */
      }
    }

    // Explicit GET (not only refetch): after PATCH customer the Colada entry
    // sometimes never re-hit the network; this guarantees full presentation.
    if (result?.status === 'accepted') {
      try {
        const full = await $fetch(`/api/orders/${orderId.value}/invoice`) as any
        if (full) {
          invoiceSnapshot.value = full
          try {
            queryCache.setQueryData(invoiceQueryKey(), full)
          } catch {
            /* ignore */
          }
        }
      } catch {
        // Keep seed — FE is accepted even if detail GET lags.
      }

      const label = [result.prefix, result.invoice_number].filter(Boolean).join('-')
      toast.success(
        label ? t('ventas.detail.acceptedWithLabel', { label }) : t('ventas.detail.accepted'),
        { title: t('ventas.detail.emitSuccessTitle') },
      )
      if (result.cufe) {
        invoiceQrDataUrl.value = await buildInvoiceQrDataUrl(result.cufe)
      }
    } else {
      emitInvoiceError.value = result?.error_message || t('ventas.detail.rejected')
    }
  } catch (e: any) {
    emitInvoiceError.value = e.data?.detail || e.data?.message || e.message || t('ventas.detail.emitError')
  } finally {
    isEmittingInvoice.value = false
  }
}

// Keep QR ready when invoice loads (refresh / refetch)
watch(
  () => invoiceData.value?.cufe,
  async (cufe) => {
    if (cufe && !invoiceQrDataUrl.value) {
      invoiceQrDataUrl.value = await buildInvoiceQrDataUrl(cufe)
    }
  },
)

const copyCufe = async (cufe: string) => {
  try {
    await navigator.clipboard.writeText(cufe)
    copiedCufe.value = true
    setTimeout(() => { copiedCufe.value = false }, 2000)
  } catch {
    // Fallback: do nothing
  }
}

const isLoading = computed(() => !orderData.value && !fetchError.value)
const itemsLoading = computed(() => !itemsData.value)
const isRefreshing = computed(() =>
  (orderAsyncStatus.value === 'loading' && orderData.value != null) ||
  (itemsAsyncStatus.value === 'loading' && itemsData.value != null)
)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  await Promise.all([refetchOrder(), refetchItems(), refetchInvoice()])
}
registerProgressiveLoading(isRefreshing)

const order = computed(() => {
  if (!orderData.value) return null

  return {
    ...orderData.value,
    customer_name: orderData.value.customer?.name || t('ventas.common.sinNombre'),
    customer_phone: orderData.value.customer?.phone || 'N/A'
  }
})

const orderCustomer = computed(() => order.value?.customer ?? null)
const orderHasInvoiceCustomer = computed(() => Boolean(orderCustomer.value?.id))
const canAssociateOrderCustomer = computed(() => Boolean(
  order.value
    && invoiceStatus.value === 'success'
    && !invoiceData.value
))
const customerAssociationLabel = computed(() =>
  orderHasInvoiceCustomer.value ? t('ventas.detail.changeCustomer') : t('ventas.detail.associateCustomer')
)
const canEmitInvoiceForOrder = computed(() => Boolean(
  !invoiceData.value
    && isInvoicingReady.value
    && order.value?.status === 'completed'
    && orderHasInvoiceCustomer.value
    && !isCreditOnlyInvoiceBlocked.value
))
const shouldShowInvoiceSection = computed(() => Boolean(
  invoiceData.value
    || isCreditOnlyInvoiceBlocked.value
    || (
      isInvoicingReady.value
      && !isReadinessLoading.value
      && orderHasInvoiceCustomer.value
    ),
))

const openCustomerModal = () => {
  if (!canAssociateOrderCustomer.value) return
  customerAssociationError.value = ''
  showCustomerModal.value = true
}

const onSaleCustomerIdentified = async (customer: SelectedCustomer) => {
  if (!customer?.id || isAssociatingCustomer.value || !canAssociateOrderCustomer.value) return
  isAssociatingCustomer.value = true
  customerAssociationError.value = ''
  try {
    await $fetch(`/api/orders/${orderId.value}/customer`, {
      method: 'PATCH',
      body: { customer_id: customer.id },
    })
    // Only refresh order — refetchInvoice here always 404s (no FE yet) and
    // was racing/poisoning the invoice query cache before emit.
    await refetchOrder()
    toast.success(t('ventas.detail.customerAssociated'), { title: t('ventas.common.listo') })
  } catch (error: any) {
    customerAssociationError.value = error.data?.detail || error.data?.message || error.message || t('ventas.detail.customerAssociateError')
  } finally {
    isAssociatingCustomer.value = false
  }
}

const orderTipPercent = computed(() => {
  const o = order.value
  if (!o?.tip_amount || o.tip_amount <= 0) return null
  const total = Number(o.total_amount) || 0
  if (total <= 0) return null
  return Math.round((Number(o.tip_amount) / total) * 10000) / 100
})

const orderAdvanceApplied = computed(() => Number(order.value?.advance_applied) || 0)

const orderChargedTotal = computed(() => {
  const o = order.value
  if (!o) return null
  const backendAmount = Number(o.charged_amount)
  if (o.charged_amount != null && Number.isFinite(backendAmount)) return backendAmount
  if ((!o.tip_amount || o.tip_amount <= 0) && orderAdvanceApplied.value <= 0) return null
  const tipTax = Number(o.tip_tax_amount) || 0
  return Math.max(
    0,
    Number(o.total_amount) + Number(o.tip_amount || 0) + tipTax - orderAdvanceApplied.value,
  )
})

const orderWaroRedemptionSummary = computed(() => order.value?.waro_redemption_summary ?? null)

const orderWaroDiscountCop = computed(
  () => Number(orderWaroRedemptionSummary.value?.waro_discount_cop) || 0,
)

const orderWaroBreakdown = computed(
  () => orderWaroRedemptionSummary.value?.waro_breakdown ?? [],
)


// Mesa legacy: discount on line net_total without order_waro_redemptions row
const orderItemsLineDiscountCop = computed(() =>
  items.value.reduce((sum: number, item: any) => {
    const sub = Number(item.subtotal) || 0
    const net = Number(item.net_total ?? item.subtotal) || 0
    return sum + Math.max(0, sub - net)
  }, 0),
)

const effectiveWaroDiscountCop = computed(() =>
  orderWaroDiscountCop.value > 0 ? orderWaroDiscountCop.value : orderItemsLineDiscountCop.value,
)

const effectiveWaroBreakdown = computed(() => {
  if (orderWaroBreakdown.value.length > 0) return orderWaroBreakdown.value
  if (orderItemsLineDiscountCop.value <= 0) return []
  return [{ cop_discount: orderItemsLineDiscountCop.value, reward_name: null, redemption_type: 'inferred' }]
})
const orderWaroLineLabel = (line: { reward_name?: string | null }) => {
  const name = line.reward_name
  return name ? `WaRo: ${name}` : t('ventas.detail.waroRedemption')
}

const hasOrderTotalsBreakdown = computed(() => {
  const o = order.value
  if (!o) return false
  return (
    (o.promo_savings ?? 0) > 0
    || (o.discount_amount ?? 0) > 0
    || effectiveWaroDiscountCop.value > 0
    || (o.standard_tax ?? 0) > 0
    || (o.liquor_tax ?? 0) > 0
    || (o.tip_amount ?? 0) > 0
    || orderAdvanceApplied.value > 0
  )
})

const items = computed(() => itemsData.value || [])

const modifierLineTotal = (mod: { price: number; quantity?: number }) =>
  Number(mod.price) * (Number(mod.quantity) || 1)

const editableItems = computed(() => {
  if (!isEditMode.value) return items.value
  return items.value.filter((item: any) => !itemsToDelete.value.has(item.id))
})

const productHeaderOptions = computed(() => {
  const products = new Map<string, string>()
  items.value.forEach((item: any) => {
    const id = String(item.product?.id || item.product_id || item.id || '')
    const name = item.product?.name || item.name || t('ventas.detail.productFallback')
    if (id && !products.has(id)) products.set(id, name)
  })
  return Array.from(products.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const visibleItems = computed(() => {
  const product = productFilter.value
  if (!product) return editableItems.value
  return editableItems.value.filter((item: any) =>
    String(item.product?.id || item.product_id || item.id || '') === product
  )
})

// Calculate adjusted total
const adjustedTotal = computed(() => {
  let total = 0
  for (const item of editableItems.value) {
    let itemTotal = Number(item.price_at_purchase) * Number(item.quantity)

    // Add modifiers that aren't deleted
    const deletedMods = modifiersToDelete.value.get(item.id) || new Set()
    for (const mod of (item.modifiers || [])) {
      if (!deletedMods.has(mod.id)) {
        itemTotal += modifierLineTotal(mod)
      }
    }
    total += itemTotal
  }
  return total
})

// Gross subtotal (before discount) — sum of all item subtotals
const grossSubtotal = computed(() => items.value.reduce((sum: number, item: any) => sum + Number(item.subtotal), 0))

// Check if there are changes
const hasChanges = computed(() => {
  return itemsToDelete.value.size > 0 ||
    Array.from(modifiersToDelete.value.values()).some(set => set.size > 0)
})

const { formatDateTime: formatDate, formatCurrency } = useFormatters()

type SaleReceiptModifier = {
  id?: string | number | null
  name: string
  quantity?: number | string | null
  price?: number | string | null
  total?: number | string | null
}

const receiptDocumentLabel = computed(() => {
  const label = (receiptPrintSettings.value.document_label || '').trim()
  if (!label || /prefactura|pre-cuenta|pre cuenta|precuenta|pre-factura|pre factura/i.test(label)) return t('ventas.common.factura')
  if (/factura/i.test(label)) return label
  return label
})

const receiptTipLabel = computed(() => {
  const label = (receiptPrintSettings.value.tip_label || t('ventas.common.propina')).trim()
  return label || t('ventas.common.propina')
})

const itemModifierTotal = (modifier: SaleReceiptModifier) =>
  (Number(modifier.price) || 0) * (Number(modifier.quantity) || 1)

const itemReceiptTotal = (item: any) => {
  const explicitSubtotal = Number(item.subtotal ?? item.net_total)
  if (Number.isFinite(explicitSubtotal) && explicitSubtotal > 0) return explicitSubtotal
  const modifiersTotal = (item.modifiers ?? []).reduce(
    (sum: number, modifier: SaleReceiptModifier) => sum + itemModifierTotal(modifier),
    0,
  )
  return (Number(item.price_at_purchase) + modifiersTotal) * (Number(item.quantity) || 1)
}

const saleReceiptItems = computed(() =>
  items.value.map((item: any) => {
    const quantity = Number(item.quantity) || 1
    const total = itemReceiptTotal(item)
    return {
      id: item.id,
      productId: item.product?.id ?? item.product_id ?? null,
      name: item.product?.name || item.name || t('ventas.detail.productFallback'),
      quantity,
      unitPrice: total / quantity,
      total,
      notes: item.notes ?? null,
      promotionName: item.promotion_name ?? item.promotionName ?? null,
      promoType: item.promotion_type ?? item.promoType ?? null,
      promoSavings: item.promo_savings_allocated ?? item.promoSavings ?? null,
      promoOptOut: item.promo_opt_out ?? item.promoOptOut ?? null,
      discountAllocated: item.discount_allocated ?? null,
      netTotal: item.net_total ?? null,
      taxCategory: item.tax_category ?? null,
      modifiers: (item.modifiers ?? []).map((modifier: any) => ({
        id: modifier.id,
        name: modifier.name || t('ventas.detail.additionFallback'),
        quantity: modifier.quantity ?? 1,
        price: Number(modifier.price) || 0,
        total: itemModifierTotal(modifier),
      })),
    }
  }),
)

const saleReceiptPromoBreakdown = computed(() => {
  const breakdown = order.value?.promo_breakdown ?? []
  if (breakdown.length > 0) return breakdown
  const savings = Number(order.value?.promo_savings) || 0
  if (savings <= 0) return []
  return [{ promotion_name: t('ventas.detail.promotionFallback'), savings }]
})

const saleReceiptWaroDiscountLabel = computed(() => {
  const firstLine = effectiveWaroBreakdown.value.find((line: any) => Number(line.cop_discount) > 0)
  return firstLine ? orderWaroLineLabel(firstLine) : t('ventas.detail.waroRedemption')
})

const saleReceiptLocationLabel = computed(() => {
  const o = order.value
  if (!o) return null
  if (o.is_delivery) return t('ventas.common.domicilio')
  if (o.source === 'barra') return t('ventas.common.barra')
  if (o.source === 'mesa') {
    const tableName = o.table_display_name || o.table_name || o.table?.name || null
    const tableCode = o.table_code || o.table?.code || null
    return [tableSingular.value, tableCode, tableName].filter(Boolean).join(' ')
  }
  return t('ventas.detail.counter')
})

const saleReceiptSoldAt = computed(() => {
  const o = order.value
  if (!o) return null
  const date = o.completed_at || o.closed_at || o.created_at || o.updated_at
  return date ? formatDate(date) : null
})

const saleReceiptCustomerFiscalLabel = computed(() => {
  const customer = order.value?.customer
  const type = customer?.fiscal_id_type || customer?.document_type || customer?.identification_type
  const number = customer?.fiscal_id || customer?.document_number || customer?.identification_number
  return type && number ? `${type}: ${number}` : null
})

const saleReceiptPayments = computed(() =>
  (order.value?.split_payments ?? []).map((payment: any) => ({
    id: payment.id,
    label: resolveLabel(payment.payment_method, payment.payment_method_id),
    amount: Number(payment.amount) || 0,
    change: Number(payment.change) || null,
  })),
)

const saleReceiptSinglePaymentLabel = computed(() => {
  const o = order.value
  if (!o?.payment_method) return null
  return resolveLabel(o.payment_method, o.payment_method_id)
})

const saleReceiptInvoiceTaxLines = computed(() => {
  const o = order.value
  if (!o) return []
  return [
    {
      label: o.standard_tax_label || t('ventas.common.impuesto'),
      amount: Number(o.standard_tax) || 0,
    },
    {
      label: t('ventas.detail.liquorVat'),
      rate: 5,
      amount: Number(o.liquor_tax) || 0,
    },
  ].filter(line => Number(line.amount) > 0)
})

const saleReceiptIssuerLabel = computed(() => {
  // Prefer API presentation.issuer (fiscal-only); fallback to local fiscal_data.
  const presentation = (invoiceData.value as any)?.presentation
  const issuer = presentation?.issuer
  if (issuer?.name || issuer?.fiscal_id) {
    const name = String(issuer.name || '').trim()
    const nit = String(issuer.fiscal_id || '').trim()
    if (name && nit) return `${name} - NIT ${nit}`
    return name || (nit ? t('ventas.detail.nit', { nit }) : null)
  }
  const name = fiscalData.value?.business_name?.trim() || null
  const nit = fiscalData.value?.nit?.trim() || null
  if (name && nit) return `${name} - NIT ${nit}`
  return name || (nit ? t('ventas.detail.nit', { nit }) : null)
})

const saleReceiptInvoice = computed(() => {
  if (!invoiceData.value) return null
  return {
    prefix: invoiceData.value.prefix,
    invoice_number: invoiceData.value.invoice_number,
    cufe: invoiceData.value.cufe,
    status: invoiceData.value.status,
    qrDataUrl: invoiceQrDataUrl.value,
    issuedAt: invoiceData.value.emitted_at ? formatDate(invoiceData.value.emitted_at) : null,
    paymentLabel: saleReceiptSinglePaymentLabel.value,
    taxLines: saleReceiptInvoiceTaxLines.value,
    issuerLabel: saleReceiptIssuerLabel.value,
  }
})

async function buildInvoiceQrDataUrl(cufe: string): Promise<string> {
  const dianUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`
  return QRCode.toDataURL(dianUrl, { width: 150, margin: 1 })
}


// ── Credit panel state ──────────────────────────────────────────────────────

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'completed': t('ventas.common.completada'),
    'cancelled': t('ventas.common.cancelada'),
    'pending': t('ventas.common.pendiente')
  }
  return labels[status] || status
}

const getInvoiceStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    accepted: t('ventas.detail.acceptedStatus'),
    pending: t('ventas.detail.pendingStatus'),
    rejected: t('ventas.detail.rejectedStatus'),
  }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'completed': 'bg-primary/10 text-primary',
    'cancelled': 'bg-status-critical-bg text-status-critical-text',
    'pending': 'bg-status-warning-bg text-status-warning-text'
  }
  return colors[status] || 'bg-secondary text-secondary-foreground'
}

const goBack = () => {
  router.push('/ventas')
}

const printReceipt = async () => {
  if (!order.value) {
    useToast().error(t('ventas.detail.printLoadError'), { title: 'Sin datos' })
    return
  }
  if (itemsLoading.value) {
    useToast().error(t('ventas.detail.printWaitProducts'), { title: t('ventas.detail.loadingSale') })
    return
  }
  if (saleReceiptItems.value.length === 0) {
    useToast().error(t('ventas.detail.printNoProducts'), { title: t('ventas.detail.noProducts') })
    return
  }
  if (invoiceData.value?.cufe && !invoiceQrDataUrl.value) {
    invoiceQrDataUrl.value = await buildInvoiceQrDataUrl(invoiceData.value.cufe)
  }

  document.body.classList.add('printing-receipt-ticket')
  await nextTick()
  const cleanup = () => {
    document.body.classList.remove('printing-receipt-ticket')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
  window.setTimeout(cleanup, 1500)
}

// Edit mode functions
const enterEditMode = () => {
  isEditMode.value = true
  itemsToDelete.value = new Set()
  modifiersToDelete.value = new Map()
}

const cancelEdit = () => {
  isEditMode.value = false
  itemsToDelete.value = new Set()
  modifiersToDelete.value = new Map()
}

const markItemForDeletion = (itemId: string) => {
  // Check if this would delete all items
  const remainingItems = items.value.filter((item: any) =>
    !itemsToDelete.value.has(item.id) && item.id !== itemId
  )

  if (remainingItems.length === 0) {
    useToast().error(t('ventas.detail.needOneProduct'), { title: t('ventas.detail.notAllowed') })
    return
  }

  const newSet = new Set(itemsToDelete.value)
  newSet.add(itemId)
  itemsToDelete.value = newSet
}

const markModifierForDeletion = (itemId: string, modifierId: string) => {
  const newMap = new Map(modifiersToDelete.value)
  if (!newMap.has(itemId)) {
    newMap.set(itemId, new Set())
  }
  const modSet = new Set(newMap.get(itemId))
  modSet.add(modifierId)
  newMap.set(itemId, modSet)
  modifiersToDelete.value = newMap
}

const isModifierDeleted = (itemId: string, modifierId: string) => {
  return modifiersToDelete.value.get(itemId)?.has(modifierId) || false
}

const updateStatus = async () => {
  if (!selectedNewStatus.value) return
  isUpdatingStatus.value = true
  try {
    await $fetch(`/api/orders/${orderId.value}/status`, {
      method: 'PATCH',
      body: {
        status: selectedNewStatus.value,
        payment_method: selectedPaymentMethod.value || undefined,
      },
    })
    await refetchOrder()
    selectedNewStatus.value = ''
    selectedPaymentMethod.value = ''
    useToast().success(t('ventas.detail.statusUpdated'), { title: 'Listo' })
  } catch (error: any) {
    useToast().error(error.data?.message || t('ventas.detail.statusUpdateError'), { title: t('ventas.common.error') })
  } finally {
    isUpdatingStatus.value = false
  }
}

const openFinalizeSalePanel = () => {
  selectedNewStatus.value = ''
  selectedPaymentMethod.value = ''
  selectedPaymentMethodId.value = null
  finalizeSaleError.value = ''
  showFinalizeSalePanel.value = true
}

const closeFinalizeSalePanel = () => {
  if (isFinalizingSale.value) return
  showFinalizeSalePanel.value = false
  finalizeSaleError.value = ''
}

const finalizePendingSale = async () => {
  if (!selectedPaymentMethod.value) {
    finalizeSaleError.value = t('ventas.detail.selectPayment')
    return
  }
  if (finalizeRequiresMethodSelection.value) {
    finalizeSaleError.value = t('ventas.detail.selectSpecificPayment')
    return
  }
  isFinalizingSale.value = true
  finalizeSaleError.value = ''
  try {
    await $fetch(`/api/orders/${orderId.value}/status`, {
      method: 'PATCH',
      body: {
        status: 'completed',
        payment_method: selectedPaymentMethod.value,
        payment_method_id: selectedPaymentMethodId.value || undefined,
        customer_id: order.value?.customer?.id || undefined,
      },
    })
    await refetchOrder()
    await refetchInvoice()
    showFinalizeSalePanel.value = false
    selectedPaymentMethod.value = ''
    selectedPaymentMethodId.value = null
    useToast().success(t('ventas.detail.saleCompleted'), { title: 'Listo' })
  } catch (error: any) {
    finalizeSaleError.value = error.data?.message || error.data?.detail || t('ventas.detail.saleCompleteError')
  } finally {
    isFinalizingSale.value = false
  }
}

// Save changes - backend handles inventory restock automatically
const saveChanges = async () => {
  if (!hasChanges.value) return

  isSaving.value = true
  try {
    // Delete items (backend automatically returns ingredients to stock)
    for (const itemId of itemsToDelete.value) {
      await $fetch(`/api/orders/${orderId.value}/items/${itemId}`, {
        method: 'DELETE'
      })
    }

    // Delete modifiers (backend automatically returns ingredients to stock)
    for (const [itemId, modifierIds] of modifiersToDelete.value) {
      // Skip if item was already deleted
      if (itemsToDelete.value.has(itemId)) continue

      for (const modifierId of modifierIds) {
        await $fetch(`/api/orders/${orderId.value}/items/${itemId}/modifiers/${modifierId}`, {
          method: 'DELETE'
        })
      }
    }

    // Refresh data
    await Promise.all([refetchOrder(), refetchItems()])

    isEditMode.value = false
    itemsToDelete.value = new Set()
    modifiersToDelete.value = new Map()

    useToast().success(t('ventas.detail.saleAdjusted'), { title: t('ventas.detail.changesSaved') })
  } catch (error: any) {
    console.error('Error saving changes:', error)
    useToast().error(error.data?.message || t('ventas.detail.saveError'), { title: t('ventas.common.error') })
  } finally {
    isSaving.value = false
  }
}

// Get layout setters
const setPageStatus = inject<(status: { label: string; color: string } | undefined) => void>('setPageStatus')
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler = inject<(handler: (() => void) | undefined) => void>('setBackHandler')
const setHeaderAction = inject<(action: { label: string; ariaLabel?: string; icon?: boolean | 'printer'; iconOnly?: boolean; handler: () => void } | undefined) => void>('setHeaderAction')

// Watch order data and update layout header
watch(order, (newOrder) => {
  if (newOrder) {
    setPageStatus?.({
      label: getStatusLabel(newOrder.status),
      color: getStatusColor(newOrder.status)
    })
  }
}, { immediate: true })

// Set back button and print action
onMounted(() => {
  setRefreshHandler(handleRefresh)
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
  setHeaderAction?.({
    label: 'Imprimir',
    ariaLabel: t('ventas.detail.printSale'),
    icon: 'printer',
    iconOnly: true,
    handler: printReceipt
  })
})

// Clean up on unmount
onUnmounted(() => {
  clearRefreshHandler(handleRefresh)
  setPageStatus?.(undefined)
  setShowBackButton?.(false)
  setBackHandler?.(undefined)
  setHeaderAction?.(undefined)
})
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State (i18n) -->
    <div v-else-if="fetchError || !order" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">{{ t('ventas.detail.orderNotFound') }}</p>
        <p class="text-sm text-text-secondary mb-6">{{ fetchError?.message || t('ventas.detail.orderNotFound') }}</p>
        <button @click="goBack" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          {{ t('ventas.common.volver') }}
        </button>
      </div>
    </div>

    <!-- Order Details -->
    <div v-else class="space-y-6">
      <!-- Order Info Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Customer Name -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('ventas.common.cliente') }}</p>
          <p class="text-lg font-bold text-text-primary">{{ order.customer_name }}</p>
          <button
            v-if="canAssociateOrderCustomer"
            type="button"
            :disabled="isAssociatingCustomer"
            class="mt-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            @click="openCustomerModal"
          >
            {{ isAssociatingCustomer ? t('ventas.common.guardando') : customerAssociationLabel }}
          </button>
          <p v-if="customerAssociationError" class="mt-2 text-xs text-destructive">
            {{ customerAssociationError }}
          </p>
        </div>

        <!-- Customer Phone -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('ventas.common.telefono') }}</p>
          <p class="text-lg font-bold text-text-primary">{{ order.customer_phone }}</p>
        </div>

        <!-- Waiter (checkout / mesa close attribution — #663/#665/#666) -->
        <div
          v-if="order.served_by_member_id"
          class="bg-surface border border-border rounded-xl p-4"
        >
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('ventas.common.mesero') }}</p>
          <NuxtLink
            :to="`/equipo/miembros/${order.served_by_member_id}`"
            class="text-lg font-bold text-primary hover:underline"
          >
            {{ order.served_by_member_name || t('ventas.detail.assigned') }}
          </NuxtLink>
        </div>

        <!-- Payment Method -->
        <component :is="order.split_payments && order.split_payments.length > 0 ? 'button' : 'div'"
          class="bg-surface border-2 border-info rounded-xl p-4 text-left w-full"
          :class="order.split_payments && order.split_payments.length > 0 ? 'hover:bg-surface-secondary/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-info/30' : ''"
          @click="order.split_payments && order.split_payments.length > 0 ? showSplitPaymentsPanel = true : null"
          :aria-label="order.split_payments && order.split_payments.length > 0 ? t('ventas.detail.viewSplitDetail') : undefined">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('ventas.common.metodoPago') }}</p>
          <div class="flex items-center justify-between gap-2">
            <p class="text-lg font-bold text-info leading-tight">
              <template v-if="order.split_payments && order.split_payments.length > 0">
                {{ t('ventas.detail.splitPaymentLabel', { count: order.split_payments.length }) }}
              </template>
              <template v-else>
                {{ order.payment_method ? resolveLabel(order.payment_method, order.payment_method_id) : t('ventas.common.sinRegistrar') }}
              </template>
            </p>
            <svg v-if="order.split_payments && order.split_payments.length > 0" class="w-4 h-4 text-info flex-shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </component>

        <button
          v-if="order.status === 'pending'"
          type="button"
          @click="openFinalizeSalePanel"
          class="bg-status-success-bg border-2 border-status-success-text/30 rounded-xl p-4 text-left w-full hover:bg-status-success-text hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-status-success-text/30 group"
        >
          <p class="text-xs font-semibold uppercase tracking-wider mb-2">{{ t('ventas.detail.pendingAction') }}</p>
          <div class="flex items-center justify-between gap-3">
            <span class="text-lg font-bold leading-tight">{{ t('ventas.detail.finalizeSale') }}</span>
            <svg class="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </button>

        <!-- Source / Origin -->
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{{ t('ventas.ordenes.colSource') }}</p>
          <span class="inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full" :class="{
            'bg-emerald-100 text-emerald-700': order.is_delivery,
            'bg-amber-100 text-amber-700': !order.is_delivery && order.source === 'barra',
            'bg-crocus-100 text-crocus-700': !order.is_delivery && order.source === 'mesa',
            'bg-blue-100 text-blue-700': !order.is_delivery && (order.source === 'pos' || !order.source),
          }">
            <template v-if="!order.is_delivery">
              <svg v-if="order.source === 'barra'" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21a48.25 48.25 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              <svg v-else-if="order.source === 'mesa'" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 10h18M3 14h18M10 10V6m4 4V6m-9 8v4m14-4v4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </template>
            {{ saleReceiptLocationLabel || t('ventas.common.pos') }}
          </span>
        </div>

      </div>

      <!-- Delivery Info Section (only for delivery orders) -->
      <div v-if="order.is_delivery" class="bg-surface border border-border rounded-2xl overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-border">
          <h2 class="text-base sm:text-lg font-bold text-text-primary">{{ t('ventas.detail.deliveryInfo') }}</h2>
        </div>

        <!-- Body — 2 column grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <!-- Address column -->
          <div class="px-5 py-5">
            <p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">{{ t('ventas.detail.deliveryAddress') }}</p>
            <template v-if="order.delivery_address">
              <p class="text-base font-semibold text-text-primary leading-snug">
                {{ order.delivery_address.address_line1 }}
              </p>
              <p v-if="order.delivery_address.address_line2" class="text-sm text-text-secondary leading-snug mt-0.5">
                {{ order.delivery_address.address_line2 }}
              </p>
              <p class="text-sm text-text-secondary leading-snug mt-0.5">
                {{ order.delivery_address.city }}<span v-if="order.delivery_address.state">, {{ order.delivery_address.state }}</span>
              </p>
              <div v-if="order.delivery_address.delivery_notes"
                class="mt-3 px-3 py-2 rounded-lg bg-surface-secondary border-l-2 border-emerald-400">
                <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">{{ t('ventas.detail.addressNotes') }}</p>
                <p class="text-sm text-text-primary leading-relaxed">{{ order.delivery_address.delivery_notes }}</p>
              </div>
              <a v-if="order.delivery_address.latitude && order.delivery_address.longitude"
                 :href="`https://www.google.com/maps/?q=${order.delivery_address.latitude},${order.delivery_address.longitude}`"
                 target="_blank" rel="noopener"
                 class="inline-flex items-center gap-1.5 mt-4 min-h-[44px] py-2 px-3 -mx-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ t('ventas.detail.viewMap') }}
              </a>
            </template>
            <p v-else class="text-sm text-text-tertiary italic flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
              {{ t('ventas.detail.addressRemoved') }}
            </p>
          </div>

          <!-- Schedule + instructions column -->
          <div class="px-5 py-5">
            <p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">{{ t('ventas.detail.deliveryTime') }}</p>
            <p class="text-base font-semibold text-text-primary leading-snug">
              {{ order.scheduled_time ? formatDate(order.scheduled_time) : t('ventas.detail.immediate') }}
            </p>
            <p v-if="!order.scheduled_time" class="text-xs text-text-secondary mt-0.5">{{ t('ventas.detail.dispatchAfterPayment') }}</p>

            <template v-if="order.delivery_instructions">
              <p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 mt-5">{{ t('ventas.detail.courierNotes') }}</p>
              <div class="px-3 py-2 rounded-lg bg-surface-secondary border-l-2 border-emerald-400">
                <p class="text-sm text-text-primary leading-relaxed">{{ order.delivery_instructions }}</p>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Electronic Invoice Section — visible when:
           (a) the order already has an emitted invoice (historical data), OR
           (b) the tenant has DIAN invoicing configured and ready and the order
               has an associated customer. Payment method is not part of this gate.
           Otherwise hidden entirely (matches the POS checkout guard pattern). -->
      <div
        v-if="shouldShowInvoiceSection"
        class="bg-surface border border-border rounded-2xl overflow-hidden"
      >
        <!-- Invoice exists -->
        <template v-if="invoiceData">
          <!-- Header -->
          <div class="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"
                aria-hidden="true">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  stroke-width="1.8" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </span>
              <div class="min-w-0">
                <h2 class="text-sm font-bold text-text-primary truncate">{{ t('ventas.detail.electronicInvoice') }}</h2>
                <p class="text-xs text-text-tertiary mt-0.5">{{ t('ventas.detail.dian') }}</p>
              </div>
            </div>

            <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
              :class="{
                'bg-status-success-bg text-status-success-text': invoiceData.status === 'accepted',
                'bg-status-warning-bg text-status-warning-text': invoiceData.status === 'pending',
                'bg-status-critical-bg text-status-critical-text': invoiceData.status === 'rejected',
              }">
              <svg v-if="invoiceData.status === 'accepted'" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <svg v-else-if="invoiceData.status === 'pending'" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {{ getInvoiceStatusLabel(invoiceData.status) }}
            </span>
          </div>

          <!-- Body: 3 columns -->
          <div class="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-border">
            <!-- Col 1: Información -->
            <div class="p-5">
              <h3 class="text-sm font-bold text-text-primary mb-4">{{ t('ventas.detail.information') }}</h3>
              <div class="space-y-4">
                <div>
                  <p class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">{{ t('ventas.detail.number') }}</p>
                  <p class="text-2xl font-extrabold text-text-primary tracking-tight tabular-nums">
                    {{ invoiceData.prefix }}-{{ invoiceData.invoice_number }}
                  </p>
                </div>
                <div v-if="invoiceData.emitted_at">
                  <p class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">{{ t('ventas.detail.issued') }}</p>
                  <p class="text-sm text-text-secondary">{{ useFormatters().formatDate(invoiceData.emitted_at) }}</p>
                </div>
              </div>
            </div>

            <!-- Col 2: Descargar / Enviar -->
            <div class="p-5 flex flex-col justify-start">
              <h3 class="text-sm font-bold text-text-primary mb-4">{{ t('ventas.detail.download') }}</h3>
              <div class="flex-1 flex flex-col justify-start gap-3 w-full h-fit">
                <p class="text-sm text-text-secondary">
                  {{ invoicePdfAvailable
                    ? t('ventas.detail.downloadPdf')
                    : t('ventas.detail.sendEmailPdfUnavailable') }}
                </p>
                <a v-if="invoicePdfAvailable"
                  :href="invoiceData.pdf_presigned_url" target="_blank" rel="noopener"
                  class="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {{ t('ventas.detail.downloadPdfCta') }}
                </a>
                <button v-if="invoiceData.status === 'accepted'"
                  type="button"
                  @click="showEmailModal = true"
                  class="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold border border-primary/20 text-primary hover:bg-primary/5 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  {{ t('ventas.detail.emailInvoiceCta') }}
                </button>
                <p v-else class="text-xs text-text-tertiary">
                  {{ t('ventas.detail.invoiceAcceptedOnly') }}
                </p>
              </div>
            </div>

            <!-- Col 3: CUFE -->
            <div class="p-5">
              <h3 class="text-sm font-bold text-text-primary mb-4">CUFE</h3>
              <div class="space-y-3">
                <p class="text-sm text-text-secondary">
                  {{ t('ventas.detail.cufeTitle') }}
                </p>
                <div v-if="invoiceData.cufe" class="rounded-xl border border-border bg-surface-secondary/50 p-3">
                  <p class="text-xs font-mono text-text-secondary break-all leading-relaxed">
                    {{ invoiceData.cufe }}
                  </p>
                </div>
                <button v-if="invoiceData.cufe" @click="copyCufe(invoiceData.cufe)"
                  class="w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border border-primary/20 text-primary hover:bg-primary/5 transition-colors">
                  {{ copiedCufe ? t('ventas.detail.cufeCopied') : t('ventas.detail.copyCode') }}
                </button>
              </div>
            </div>
          </div>

          <!-- warocol.com#589 — unrecoverable rejection: factura ya validada en DIAN
               pero la fila local no se pudo persistir. La emisión ya consumió
               un número de la resolución; no tiene sentido reintentar. -->
          <div v-if="isUnrecoverableRejection"
            class="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20 dark:border-amber-800/40">
            <svg class="w-5 h-5 mt-0.5 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {{ t('ventas.detail.invoiceValidatedTitle', { label: `${invoiceData.prefix || ''}${invoiceData.invoice_number || ''}` }) }}
              </p>
              <p class="text-xs text-amber-700/90 dark:text-amber-400 mt-1 leading-relaxed">
                {{ t('ventas.detail.invoiceValidatedBody') }}
                {{ t('ventas.detail.invoiceReconcileSupport') }}
              </p>
            </div>
          </div>

          <!-- Error message for rejected (other reasons — retry allowed) -->
          <div v-else-if="invoiceData.status === 'rejected' && invoiceData.error_message"
            class="mx-5 mb-5 space-y-3">
            <div class="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2.5 dark:bg-red-950/20 dark:text-red-400">
              <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <div class="min-w-0 space-y-1">
                <span>{{ invoiceData.error_message }}</span>
                <p v-if="isMatiasAuthInvoiceError" class="text-xs opacity-90">
                  {{ t('ventas.detail.matiasAuthError') }}
                </p>
              </div>
            </div>
            <button
              v-if="canRetryInvoice"
              type="button"
              @click="emitInvoice"
              :disabled="isEmittingInvoice"
              class="w-full min-h-[44px] py-2 px-4 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 flex items-center justify-center gap-2"
            >
              <template v-if="isEmittingInvoice">
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {{ t('ventas.detail.retrying') }}
              </template>
              <template v-else>
                {{ t('ventas.detail.retryEmit') }}
              </template>
            </button>
            <p v-if="emitInvoiceError" class="text-sm text-destructive flex items-center gap-1.5">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {{ emitInvoiceError }}
            </p>
          </div>
        </template>

        <!-- No invoice — pure credit orders are not emitted from this flow -->
        <template v-else-if="isCreditOnlyInvoiceBlocked">
          <div class="px-5 py-3 flex items-start gap-3">
            <span class="w-9 h-9 rounded-lg bg-state-warning-bg text-state-warning-text flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm9-3.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text-primary leading-tight">{{ t('ventas.detail.invoiceUnavailableTitle') }}</p>
              <p class="text-xs text-text-secondary leading-snug">
                {{ t('ventas.detail.invoiceUnavailableBody') }}
              </p>
            </div>
          </div>
        </template>

        <!-- No invoice — eligible completed order: show emit button -->
        <template v-else-if="canEmitInvoiceForOrder">
          <div class="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <span class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text-primary leading-tight">{{ t('ventas.detail.noInvoiceTitle') }}</p>
              <p class="text-xs text-text-secondary leading-snug">{{ t('ventas.detail.noInvoiceBody') }}</p>
            </div>
            <button @click="emitInvoice" :disabled="isEmittingInvoice"
              class="flex-shrink-0 min-h-[44px] py-2 px-4 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 flex items-center justify-center gap-2">
              <template v-if="isEmittingInvoice">
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {{ t('ventas.detail.generating') }}
              </template>
              <template v-else>
                {{ t('ventas.detail.emitCta') }}
              </template>
            </button>
          </div>
          <p v-if="emitInvoiceError" class="px-5 pb-3 text-sm text-destructive flex items-center gap-1.5">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {{ emitInvoiceError }}
          </p>
        </template>

        <!-- No invoice — order not completed -->
        <template v-else>
          <div class="px-5 py-3 flex items-center gap-3">
            <svg class="w-5 h-5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-text-tertiary">{{ t('ventas.detail.invoiceWhenComplete') }}</p>
          </div>
        </template>
      </div>

      <!-- Status Update Panel (mesa and barra orders) -->
      <div v-if="order.source === 'mesa' || order.source === 'barra'"
        class="bg-surface border border-border rounded-xl p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <h2 class="text-xs font-bold text-text-tertiary uppercase tracking-widest">{{ t('ventas.detail.changeStatus') }}</h2>
        </div>

        <!-- Status cards -->
        <div class="grid grid-cols-3 gap-2.5">
          <!-- Pendiente -->
          <button type="button" @click="selectedNewStatus = selectedNewStatus === 'pending' ? '' : 'pending'" :class="[
            'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
            selectedNewStatus === 'pending'
              ? 'bg-status-warning-bg border-status-warning-text/50 shadow-sm'
              : 'bg-surface border-border'
          ]">
            <div
              :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'pending' ? 'bg-status-warning-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150"
                :class="selectedNewStatus === 'pending' ? 'text-status-warning-text' : 'text-text-tertiary group-hover:text-status-warning-text'"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span
              :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'pending' ? 'text-status-warning-text' : 'text-text-secondary group-hover:text-status-warning-text']">{{ t('ventas.common.pendiente') }}</span>
          </button>

          <!-- Completada -->
          <button type="button"
            @click="() => { selectedNewStatus = selectedNewStatus === 'completed' ? '' : 'completed'; selectedPaymentMethod = '' }"
            :class="[
              'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
              selectedNewStatus === 'completed'
                ? 'bg-status-success-bg border-status-success-text/50 shadow-sm'
                : 'bg-surface border-border'
            ]">
            <div
              :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'completed' ? 'bg-status-success-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150"
                :class="selectedNewStatus === 'completed' ? 'text-status-success-text' : 'text-text-tertiary group-hover:text-status-success-text'"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span
              :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'completed' ? 'text-status-success-text' : 'text-text-secondary group-hover:text-status-success-text']">{{ t('ventas.common.completada') }}</span>
          </button>

          <!-- Cancelada -->
          <button type="button" @click="selectedNewStatus = selectedNewStatus === 'cancelled' ? '' : 'cancelled'"
            :class="[
              'group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border-2 transition-all duration-150 focus:outline-none',
              selectedNewStatus === 'cancelled'
                ? 'bg-status-critical-bg border-status-critical-text/50 shadow-sm'
                : 'bg-surface border-border'
            ]">
            <div
              :class="['w-9 h-9 rounded-full flex items-center justify-center', selectedNewStatus === 'cancelled' ? 'bg-status-critical-text/15' : 'bg-surface-secondary']">
              <svg class="w-4.5 h-4.5 transition-colors duration-150"
                :class="selectedNewStatus === 'cancelled' ? 'text-status-critical-text' : 'text-text-tertiary group-hover:text-status-critical-text'"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span
              :class="['text-xs font-bold uppercase tracking-wider leading-none transition-colors duration-150', selectedNewStatus === 'cancelled' ? 'text-status-critical-text' : 'text-text-secondary group-hover:text-status-critical-text']">{{ t('ventas.common.cancelada') }}</span>
          </button>
        </div>

        <!-- Payment method (only when completing) -->
        <Transition name="slide-down">
          <div v-if="selectedNewStatus === 'completed'" class="space-y-2">
            <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider">{{ t('ventas.common.metodoPago') }}</p>
            <div class="flex flex-wrap gap-2">
              <button v-for="group in paymentGroups" :key="group.slug" type="button"
                @click="selectedPaymentMethod = selectedPaymentMethod === group.slug ? '' : group.slug"
                :class="selectedPaymentMethod === group.slug ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:border-primary/40'"
                class="flex-1 min-h-[44px] px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors">
                {{ group.name }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Confirm button -->
        <button @click="updateStatus"
          :disabled="!selectedNewStatus || isUpdatingStatus || (selectedNewStatus === 'completed' && !selectedPaymentMethod)"
          :class="[
            'w-full h-11 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
            selectedNewStatus === 'cancelled'
              ? 'bg-status-critical-bg text-status-critical-text border-2 border-status-critical-text/30 hover:bg-status-critical-text hover:text-white'
              : 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm'
          ]">
          <UiLoadingDots v-if="isUpdatingStatus" size="10px" />
          <template v-else>
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {{ t('ventas.detail.confirmChange') }}
          </template>
        </button>
      </div>

      <!-- Order Items -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="p-6 border-b border-border flex justify-between items-center">
          <h2 class="text-lg font-semibold text-text-primary">{{ t('ventas.detail.orderItemsTitle', { count: order.items_count }) }}</h2>

          <!-- Edit/Save Buttons -->
          <div class="flex gap-2">
            <template v-if="!isEditMode">
              <button @click="enterEditMode"
                class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {{ t('ventas.detail.editSale') }}
              </button>
            </template>
            <template v-else>
              <button @click="cancelEdit"
                class="px-4 py-2 border border-border text-text-secondary hover:bg-surface-secondary rounded-lg text-sm font-medium transition-colors">
                {{ t('ventas.common.cancelar') }}
              </button>
              <button @click="saveChanges" :disabled="!hasChanges || isSaving"
                class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="isSaving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ isSaving ? t('ventas.common.guardando') : t('ventas.common.guardar') }}
              </button>
            </template>
          </div>
        </div>

        <!-- Edit Mode Warning -->
        <div v-if="isEditMode"
          class="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
          <p class="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span><strong>{{ t('ventas.detail.editModeTitle') }}</strong> {{ t('ventas.detail.editModeHint') }}</span>
          </p>
        </div>

        <!-- Loading Items -->
        <div v-if="itemsLoading" class="flex items-center justify-center py-12">
          <CommonsTheCustomLoader size="large" />
        </div>

        <!-- Items Table with Expandable Modifiers -->
        <div v-else-if="editableItems.length > 0" class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-surface-secondary">
              <tr>
                <th v-if="isEditMode" class="px-4 py-3 w-12"></th>
                <th class="px-6 py-3 text-left">
                  <UiTableHeaderFilter
                    v-model="productFilter"
                    :title="t('ventas.common.producto')"
                    filter-type="select"
                    :options="productHeaderOptions"
                    :all-label="t('ventas.common.producto')"
                    align="left"
                  />
                </th>
                <th class="px-6 py-3 text-center">
                  <UiTableHeaderFilter
                    :title="t('ventas.detail.quantityShort')"
                    filter-type="none"
                    align="center"
                  />
                </th>
                <th class="px-6 py-3 text-right">
                  <UiTableHeaderFilter
                    :title="t('ventas.detail.price')"
                    filter-type="none"
                    align="right"
                  />
                </th>
                <th class="px-6 py-3 text-right">
                  <UiTableHeaderFilter
                    :title="t('ventas.common.subtotal')"
                    filter-type="none"
                    align="right"
                  />
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <template v-for="item in visibleItems" :key="item.id">
                <!-- Product Row (Main) -->
                <tr class="bg-surface hover:bg-surface-secondary/50 transition-colors">
                  <td v-if="isEditMode" class="px-4 py-4">
                    <button @click="markItemForDeletion(item.id)"
                      class="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                      :title="t('ventas.detail.deleteProduct')">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                        {{ item.product.image || '🍽️' }}
                      </div>
                      <div>
                        <p class="text-sm font-semibold text-text-primary">{{ item.product.name }}</p>
                        <p v-if="item.notes" class="text-xs text-text-tertiary italic mt-0.5">{{ item.notes }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {{ item.quantity }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-medium text-text-primary">{{ formatCurrency(item.price_at_purchase)
                    }}</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-bold text-primary">{{ formatCurrency(item.subtotal) }}</span>
                  </td>
                </tr>

                <!-- Modifier Rows (Sub-rows) -->
                <template v-for="modifier in (item.modifiers || [])" :key="`${item.id}-mod-${modifier.id}`">
                  <tr v-if="!isModifierDeleted(item.id, modifier.id)" class="bg-surface-secondary/30">
                    <td v-if="isEditMode" class="px-4 py-2">
                      <button @click="markModifierForDeletion(item.id, modifier.id)"
                        class="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors ml-2"
                        :title="t('ventas.detail.deleteAddition')">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                    <td class="px-6 py-2" :class="isEditMode ? '' : 'pl-14'">
                      <div class="flex items-center gap-2" :class="isEditMode ? 'pl-8' : ''">
                        <span class="text-primary text-xs">+</span>
                        <span class="text-xs text-text-secondary">{{ modifier.name }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-2 text-center">
                      <span class="text-xs text-text-tertiary">x{{ modifier.quantity ?? 1 }}</span>
                    </td>
                    <td class="px-6 py-2 text-right">
                      <span class="text-xs text-text-secondary">{{ formatCurrency(modifier.price) }}</span>
                    </td>
                    <td class="px-6 py-2 text-right">
                      <span class="text-xs text-primary/70">{{ formatCurrency(modifierLineTotal(modifier)) }}</span>
                    </td>
                  </tr>
                </template>
              </template>
              <tr v-if="visibleItems.length === 0">
                <td
                  :colspan="isEditMode ? 5 : 4"
                  class="px-6 py-12 text-center text-sm text-text-secondary"
                >
                  {{ t('ventas.detail.noProductsForFilter') }}
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-surface-secondary border-t-2 border-border">
              <tr>
                <td v-if="isEditMode"></td>
                <td colspan="3" class="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                  {{ t('ventas.detail.orderTotalLabel') }}
                </td>
                <td class="px-6 py-4 text-right">
                  <span class="text-xl font-bold text-primary">
                    {{ isEditMode && hasChanges ? formatCurrency(adjustedTotal) : formatCurrency(order.total_amount) }}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>

          <!-- Totals summary — promos, discounts, taxes, tip -->
          <div
            v-if="hasOrderTotalsBreakdown"
            class="flex justify-end px-6 py-4 border-t border-border"
          >
            <div class="flex flex-col gap-2 min-w-[220px]">
              <div class="flex items-center justify-between gap-10">
                <span class="text-sm text-text-secondary">{{ t('ventas.common.subtotal') }}</span>
                <span class="text-sm text-text-secondary tabular-nums">{{ formatCurrency(grossSubtotal) }}</span>
              </div>
              <div
                v-for="promo in (order.promo_breakdown ?? [])"
                :key="promo.promotion_id"
                class="flex items-center justify-between gap-10"
              >
                <span class="text-sm text-emerald-700 dark:text-emerald-400">
                  {{ promo.promotion_name }}
                  <span class="text-xs text-text-tertiary">({{ formatPromoTypeLabel(promo.promo_type) }})</span>
                </span>
                <span class="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  -{{ formatCurrency(promo.savings) }}
                </span>
              </div>
              <div v-if="order.discount_amount > 0" class="flex items-center justify-between gap-10">
                <span class="flex items-center gap-1.5 text-sm text-destructive">
                  {{ t('ventas.common.descuentoManual') }}
                  <span
                    class="text-xs font-bold bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 leading-tight">
                    {{ order.discount_type === 'percent' ? `${order.discount_value}%` : t('ventas.detail.fixedDiscount') }}
                  </span>
                </span>
                <span class="text-sm font-semibold text-destructive tabular-nums">-{{
                  formatCurrency(order.discount_amount)
                }}</span>
              </div>
              <div
                v-for="(waroLine, waroIdx) in effectiveWaroBreakdown"
                :key="waroLine.waro_reward_id ?? waroLine.redemption_type ?? waroIdx"
                v-show="Number(waroLine.cop_discount) > 0"
                class="flex items-center justify-between gap-10"
              >
                <span class="text-sm text-amber-700 dark:text-amber-400">
                  {{ orderWaroLineLabel(waroLine) }}
                </span>
                <span class="text-sm font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                  -{{ formatCurrency(Number(waroLine.cop_discount)) }}
                </span>
              </div>
              <div v-if="order.standard_tax > 0" class="flex items-center justify-between gap-10">
                <span class="text-sm text-text-secondary">{{ order.standard_tax_label }}</span>
                <span class="text-sm tabular-nums text-text-secondary">{{ formatCurrency(order.standard_tax) }}</span>
              </div>
              <div v-if="order.liquor_tax > 0" class="flex items-center justify-between gap-10">
                <span class="text-sm text-text-secondary">{{ t('ventas.detail.liquorVat') }}</span>
                <span class="text-sm tabular-nums text-text-secondary">{{ formatCurrency(order.liquor_tax) }}</span>
              </div>
              <div
                v-if="order.tip_amount && order.tip_amount > 0"
                class="flex items-center justify-between gap-10"
              >
                <span class="text-sm text-text-secondary">
                  {{ t('ventas.common.propina') }}
                  <span v-if="orderTipPercent != null" class="text-xs text-text-tertiary">
                    ({{ orderTipPercent }}%)
                  </span>
                </span>
                <span class="text-sm font-medium text-primary tabular-nums">
                  +{{ formatCurrency(order.tip_amount) }}
                </span>
              </div>
              <div
                v-if="order.tip_tax_amount && order.tip_tax_amount > 0"
                class="flex items-center justify-between gap-10"
              >
                <span class="text-sm text-text-secondary">{{ t('ventas.detail.tipTax') }}</span>
                <span class="text-sm tabular-nums text-text-secondary">
                  +{{ formatCurrency(order.tip_tax_amount) }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-10 pt-2 border-t border-border">
                <span class="text-sm font-bold text-text-primary">
                  {{ order.tip_amount && order.tip_amount > 0 ? t('ventas.detail.orderTotal') : t('ventas.common.total') }}
                </span>
                <span class="text-base font-bold text-primary tabular-nums">{{ formatCurrency(order.total_amount)
                }}</span>
              </div>
              <div
                v-if="orderAdvanceApplied > 0"
                class="flex items-center justify-between gap-10"
              >
                <span class="text-sm text-state-success-text">{{ t('ventas.detail.tableAdvance') }}</span>
                <span class="text-sm font-semibold text-state-success-text tabular-nums">
                  -{{ formatCurrency(orderAdvanceApplied) }}
                </span>
              </div>
              <div
                v-if="orderChargedTotal != null"
                class="flex items-center justify-between gap-10"
              >
                <span class="text-sm font-bold text-text-primary">{{ t('ventas.detail.totalCharged') }}</span>
                <span class="text-base font-bold text-primary tabular-nums">
                  {{ formatCurrency(orderChargedTotal) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <p class="text-sm text-text-secondary">{{ t('ventas.detail.noItems') }}</p>
        </div>
      </div>

    </div>

    <!-- Finalize Pending Sale Slide-over -->
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="showFinalizeSalePanel" class="fixed inset-0 z-40 bg-black/40"
          @click="closeFinalizeSalePanel" aria-hidden="true" />
      </Transition>

      <Transition name="panel">
        <div v-if="showFinalizeSalePanel" role="dialog" aria-modal="true" :aria-label="t('ventas.detail.finalizePendingSale')"
          class="fixed z-50 flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full">
          <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          </div>

          <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">{{ t('ventas.detail.finalizeSale') }}</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ t('ventas.detail.orderNumber', { number: order.order_number }) }} · {{ formatCurrency(order.total_amount) }}
                </p>
              </div>
              <button @click="closeFinalizeSalePanel" type="button" :aria-label="t('ventas.common.cerrarPanel')"
                class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <div>
              <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">{{ t('ventas.common.metodoPago') }}</p>
              <PaymentsPaymentMethodSelector
                v-model="finalizePaymentSelection"
                :groups="paymentGroups"
                :disabled="isFinalizingSale"
              />
            </div>

            <p v-if="finalizeSaleError" class="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {{ finalizeSaleError }}
            </p>
          </div>

          <div class="flex-shrink-0 border-t border-border p-6">
            <button
              type="button"
              @click="finalizePendingSale"
              :disabled="isFinalizingSale || !selectedPaymentMethod || finalizeRequiresMethodSelection"
              class="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <UiLoadingDots v-if="isFinalizingSale" size="9px" />
              <span v-else>{{ t('ventas.detail.finalizeSale') }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Split Payments Slide-over -->
    <Teleport to="body">
      <!-- Backdrop -->
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="showSplitPaymentsPanel" class="fixed inset-0 z-40 bg-black/40"
          @click="showSplitPaymentsPanel = false" aria-hidden="true" />
      </Transition>

      <!-- Panel -->
      <Transition name="panel">
        <div v-if="showSplitPaymentsPanel" role="dialog" aria-modal="true" :aria-label="t('ventas.detail.splitPaymentAria')"
          class="fixed z-50 flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full">
          <!-- Mobile drag handle -->
          <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          </div>

          <!-- Header -->
          <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info"
                  aria-hidden="true">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h2 class="text-base font-bold text-text-primary leading-tight">{{ t('ventas.detail.splitPaymentTitle') }}</h2>
                  <p class="text-xs text-text-secondary leading-snug mt-0.5">
                    {{ t('ventas.detail.splitPaymentSummary', { count: order.split_payments.length, amount: formatCurrency(order.total_amount) }) }}
                  </p>
                </div>
              </div>
              <button @click="showSplitPaymentsPanel = false" type="button" :aria-label="t('ventas.common.cerrarPanel')"
                class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Payment list -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            <div v-for="(p, idx) in order.split_payments" :key="p.id"
              class="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3">
              <div class="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg class="h-3.5 w-3.5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                  fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-text-secondary">{{ t('ventas.detail.paymentIndex', { number: Number(idx) + 1 }) }}</p>
                <p class="text-sm font-medium text-text-primary">{{ resolveLabel(p.payment_method, p.payment_method_id)
                }}
                </p>
              </div>
              <span class="text-base font-bold text-text-primary tabular-nums flex-shrink-0">{{ formatCurrency(p.amount)
              }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- warocol.com#603 — send-invoice-by-email modal (WARO-branded via SES) -->
    <VentasInvoiceEmailModal
      v-if="invoiceData"
      v-model:open="showEmailModal"
      :order-id="orderId"
      :invoice-label="`${invoiceData.prefix}-${invoiceData.invoice_number}`"
      :customer="orderData?.customer ?? null"
      @sent="onInvoiceEmailSent"
    />

    <PosCustomerIdentificationModal
      v-model="showCustomerModal"
      @customer-identified="onSaleCustomerIdentified"
    />

    <PosReceiptPrintTicket
      v-if="order"
      :fiscal-data="fiscalData"
      :platform-legal="platformLegal"
      :display-name="businessProfile?.display_name"
      :address="businessProfile?.address"
      :city="businessProfile?.city"
      :phone="businessProfile?.phone_number"
      :logo-url="receiptLogoUrl"
      :document-label="receiptDocumentLabel"
      :order-number="order.order_number"
      :sold-at="saleReceiptSoldAt"
      :location-label="saleReceiptLocationLabel"
      :waiter-name="order.served_by_member_name"
      :customer-name="order.customer_name"
      :customer-fiscal-label="saleReceiptCustomerFiscalLabel"
      :items="saleReceiptItems"
      :subtotal="grossSubtotal"
      :promo-breakdown="saleReceiptPromoBreakdown"
      :discount-amount="Number(order.discount_amount) || 0"
      :waro-discount-label="saleReceiptWaroDiscountLabel"
      :waro-discount-amount="effectiveWaroDiscountCop"
      :standard-tax-label="order.standard_tax_label"
      :standard-tax="Number(order.standard_tax) || 0"
      :liquor-tax="Number(order.liquor_tax) || 0"
      :order-total="Number(order.total_amount) || 0"
      :tip-label="receiptTipLabel"
      :tip-amount="Number(order.tip_amount) || 0"
      :tip-tax-amount="Number(order.tip_tax_amount) || 0"
      :advance-applied="orderAdvanceApplied"
      :charged-total="orderChargedTotal"
      :payments="saleReceiptPayments"
      :single-payment-label="saleReceiptSinglePaymentLabel"
      :invoice="saleReceiptInvoice"
    />
  </div>
</template>

<style>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.panel-enter-active,
.panel-leave-active {
  transition: transform 0.3s ease;
}

.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}

@media (min-width: 768px) {

  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
