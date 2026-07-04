<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { $fetch } from 'ofetch'
import { useQuery } from '@pinia/colada'
import QRCode from 'qrcode'
import { usePOSStore, type TabItem } from '~/stores/usePOSStore'
import { clearTableQrPaymentIntent, readTableQrPaymentIntent } from '~/composables/useTableSessionSync'
import { useAddressStore, type AddressCreate } from '~/stores/address'
import { PAYMENT_DEFAULTS, WALLET_PAYMENT_SLUG, mergePosPaymentGroupsFromApi, type PosPaymentGroup, type PosPaymentMethod } from '~/utils/paymentDefaults'
import type { WaroReward } from '~/composables/useWaroRewards'
import type { PromoLineForRedemption } from '~/composables/useWaroRedemptionPreview'
import DeliveryAddressPicker from '~/components/pos/checkout/DeliveryAddressPicker.vue'
import DeliveryAddressForm from '~/components/pos/checkout/DeliveryAddressForm.vue'
import { displayTableCode } from '~/composables/useTableDisplayCode'
import { formatPromoTypeLabel } from '~/utils/promotionPreview'
import { computePromoEligibleSubtotal, linePromoSavingsForProduct } from '~/utils/promoProductMatch'
import { posDebugLog, posDebugSerializeError } from '~/utils/posDebugLog'
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import { mapComandasForPrint, printComandaTickets } from '~/composables/useComandaPrint'

interface TopProduct {
  name: string
  count: number
}

interface CustomerInsights {
  orders_count: number
  last_order_date: string | null
  avg_ticket: number | null
  top_products: TopProduct[] | null
  avg_days_between_visits: number | null
}

definePageMeta({
  layout: 'dashboard',
  module: 'pos',
})

useHead({ title: 'Checkout' })

const router = useRouter()
const posStore = usePOSStore()
const cache = useQueryCache()
const toast = useToast()
const { currentTenant, businessProfile } = useTenantReactive()
const { timezone } = useTenantTimezone()
const { singular: tableSingular } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())

function formatTenantDateTime(date = new Date()) {
  return date.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: timezone.value,
  })
}

function invalidateCheckoutPromoPreview() {
  cache.invalidateQueries({ key: ['pos', 'cart', posStore.cartId ?? null, 'tax-preview'] })
  if (isKitchenServiceMode.value && posStore.activeTableSession?.tableId) {
    cache.invalidateQueries({ key: ['tables', posStore.activeTableSession.tableId, 'current'] })
  }
}

const { activePromos, hasActivePromos, activePromoHint, promoPickOptions } = useActivePromotions({
  onActivePromosChanged: invalidateCheckoutPromoPreview,
})

// State
const selectedPaymentMethod = ref<string>('cash')
const selectedPaymentMethodId = ref<string | null>(null)
const posPaymentGroups = ref<PosPaymentGroup[]>(PAYMENT_DEFAULTS)
const creditDueDate = ref<string>('')
const methodSearch = ref<string>('')
const isProcessing = ref(false)
const processingError = ref('')
const isSyncingCart = ref(false)
const syncError = ref('')

// Discount state
const discountEnabled = ref(false)
const discountType = ref<'percent' | 'fixed'>('percent')
const discountInput = ref('')

type PromoBreakdownLine = {
  promotion_id?: string
  promotion_name: string
  promo_type: string
  savings: number
}

type WaroRedemptionBreakdownLine = {
  redemption_type?: string
  waros_spent?: number
  cop_discount?: number
  waro_reward_id?: string | null
  reward_name?: string | null
}

type WaroRedemptionSummary = {
  waro_discount_cop: number
  waros_spent?: number
  waro_breakdown?: WaroRedemptionBreakdownLine[]
}

// Success modal state
const showSuccessModal = ref(false)
const orderResult = ref<{
  order_number: number
  total_amount: number
  payment_method?: string | null
  payment_method_name?: string
  status?: string
  payment_status?: string | null
  customer_id?: string
  discount_amount?: number
  subtotal?: number
  promo_savings?: number
  promo_breakdown?: Array<{ promotion_id?: string; promotion_name: string; promo_type: string; savings: number }>
  waro_discount_cop?: number
  waro_reward_name?: string | null
  waro_redemption_summary?: WaroRedemptionSummary
  standard_tax?: number
  liquor_tax?: number
  standard_tax_label?: string
  order_id?: string
  order_ids?: string[]
  order_numbers?: number[]
  tip_amount?: number
  charged_amount?: number
  advance_applied?: number
  cash_received?: number
  change?: number
} | null>(null)
const wasMesaMode = ref(false)
const receiptEmail = ref('')
const emailSent = ref(false)
const emailFromProfile = ref(false)
const isSendingEmail = ref(false)
const cartItemsSnapshot = ref<any[]>([])

type FiscalIdType = 'CC' | 'NIT' | 'CE' | 'PA' | 'TI'

interface ReceiptPaymentLine {
  id: string
  amount: number
  payment_method: string
  payment_method_id?: string | null
  payment_method_name: string
  cash_received?: number | null
  change?: number | null
}

interface ReceiptPrintContext {
  soldAt: string
  wasMesa: boolean
  isBar: boolean
  tableName: string | null
  tableCode: string | null
  waiterName: string | null
  customerName: string | null
  customerFiscalIdType: FiscalIdType | null
  customerFiscalId: string | null
  customerFiscalBusinessName: string | null
  singlePaymentCashReceived: number | null
  singlePaymentChange: number | null
  advanceApplied: number
}

const receiptPrintContext = ref<ReceiptPrintContext | null>(null)
const splitPaymentsSnapshot = ref<ReceiptPaymentLine[]>([])

// Invoicing readiness gate (issue #450) — derived from the POS restaurant
// context aggregator (`settingsData` below). Backend gates the rich
// readiness detail under owner-only MI_NEGOCIO; POS only needs the boolean,
// which is included in /api/pos/restaurant-context.
const isInvoicingReady = computed(() => settingsData.value?.data?.invoicing_ready === true)
const isReadinessLoading = computed(() => !settingsData.value)

// Invoice state
const invoiceLoading = ref(false)
const invoiceResult = ref<{ cufe: string; invoice_number: number; prefix: string; pdf_presigned_url: string | null; status: string } | null>(null)
const invoiceError = ref('')
const invoiceQrDataUrl = ref('')
const invoiceProgress = ref('')
const invoiceResults = ref<{ order_id: string; prefix: string; invoice_number: number; cufe: string; status: string; error?: string }[]>([])

const extractInvoiceFetchError = (e: any) =>
  e?.data?.detail || e?.data?.message || e?.message || 'Error al generar factura'

const isMatiasAuthInvoiceError = computed(() => {
  const msg = invoiceError.value.toLowerCase()
  return msg.includes('401') || msg.includes('unauthenticated')
})

// Customer identification via modal
const showCustomerModal = ref(false)
interface PosCustomer {
  id: string
  name: string | null
  phone_number: string | null
  email: string | null
  fiscal_id_type?: FiscalIdType | null
  fiscal_id?: string | null
  fiscal_business_name?: string | null
  fiscal_email?: string | null
}
const selectedCustomer = ref<PosCustomer | null>(null)

// Inline fiscal-data wizard inside the success modal — shown after the user
// clicks "Generar factura electrónica DIAN" if the customer has no fiscal data yet.
const fiscalWizardOpen = ref(false)
const fiscalWizardSaving = ref(false)
const fiscalWizardError = ref('')
const fiscalWizardForm = ref({
  fiscal_id_type: '' as FiscalIdType | '',
  fiscal_id: '',
  fiscal_business_name: '',
})
const fiscalWizardCanSubmit = computed(() => Boolean(
  fiscalWizardForm.value.fiscal_id_type
    && fiscalWizardForm.value.fiscal_id.trim()
    && fiscalWizardForm.value.fiscal_business_name.trim(),
))

// Customer insights
const customerInsights = ref<CustomerInsights | null>(null)
const insightsLoading = ref(false)
// Accordions start closed; the user opens them on demand. Previous behavior
// auto-opened "summary" / "insights" on customer change — too noisy.
const activeAccordion = ref<'order' | 'comandas' | 'insights' | 'summary' | 'waros' | null>(null)

const { tabItems: storeTabItems } = storeToRefs(posStore)

// Issue #526 — tax preview for the cart sidebar.
// Mesa: reads from /api/tables/{id}/current.session (existing).
// Counter / Bar: reads from /api/pos/cart/{id}/tax-preview (new — see #526).
// Both endpoints route through the shared `_compute_tax_breakdown` helper,
// so the sidebar always agrees with the cobrar response.
type TaxPreview = {
  standard_tax: number
  liquor_tax: number
  standard_tax_label: string
}

type PromoPreviewLine = {
  id: string
  promo_savings?: number
  promoSavings?: number
  locked_promo_savings?: number
  promotion_name?: string | null
  promotionName?: string | null
  locked_promotion_name?: string | null
  promo_type?: string | null
  promoType?: string | null
  locked_promo_type?: string | null
  subtotal_after_promo?: number
}

type CheckoutPromoPreview = {
  subtotal?: number
  promo_savings?: number
  subtotal_after_promos?: number
  promo_breakdown?: Array<{ promotion_name: string; promo_type: string; savings: number }>
  lines?: PromoPreviewLine[]
}
// taxPreview is now a computed derived from the mesa/POS useQuery results
// (declared further down, after discountedTotal). The legacy refreshTaxPreview
// function + manual debounced watcher were removed in the parallel-loading
// refactor — keys reactive to cartId/discountAmount drive refetches.

// ── POS restaurant context (BFF aggregator) — reuses same cache key as index.vue (no extra network request)
// Migrated from /api/api/tenant/public-profile (now owner-only MI_NEGOCIO).
const { data: settingsData, asyncStatus: settingsAsyncStatus } = useQuery({
  key: () => ['pos', 'restaurant-context', currentTenant.value?.id ?? null],
  query: () => $fetch<{ success: boolean; data: any }>('/api/pos/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Payment methods — shared cache with /ventas/ordenes (same key).
// 5 min staleTime: methods change rarely; navigating back to checkout reuses
// the cache without a network call.
const {
  data: paymentMethodsData,
  asyncStatus: paymentMethodsAsyncStatus,
} = useQuery({
  key: () => ['payments', 'pos-methods', currentTenant.value?.id ?? null],
  query: () => $fetch<{ success: boolean; data: PosPaymentGroup[] }>('/api/pos/payment-methods'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
watch(paymentMethodsData, (data) => {
  if (data?.success && data.data?.length) {
    posPaymentGroups.value = mergePosPaymentGroupsFromApi(data.data)
  }
}, { immediate: true })
const comandasEnabled = computed(() => settingsData.value?.data?.comandas_enabled === true)

// Mesa vs barra kitchen service (#799). Bar with tab lines stays cuenta mode even
// before restaurant-context resolves — prevents false "Carrito vacío" (#1108).
const isKitchenServiceMode = computed(() => {
  const session = posStore.activeTableSession
  if (!session) return false
  if (!session.isBar) return true
  if (storeTabItems.value.length > 0) return true
  return comandasEnabled.value
})
const isMesaMode = computed(
  () => !!posStore.activeTableSession && !posStore.activeTableSession?.isBar,
)

// Issue #537 — expediter mode (waiter advances comanda state from POS)
const expediterEnabled = computed(() => settingsData.value?.data?.expediter_enabled === true)
const showExpediterPanel = ref(false)
const acceptsOnlineOrders = computed(() => settingsData.value?.data?.accepts_online_orders === true)

// warocol.com#639 — tipping config (gated by tenant; defaults keep selector hidden)
const tipEnabled = computed(() => settingsData.value?.data?.tip_enabled === true)
const allowPromoLineOptOut = computed(
  () => settingsData.value?.data?.allow_promo_line_opt_out === true,
)
const tipPresets = computed<number[]>(() => settingsData.value?.data?.tip_default_percentages ?? [10])
const tipModel = ref<{ amount: number; source: 'preset' | 'custom' | 'none' }>({ amount: 0, source: 'none' })
const tipAmount = computed(() => tipModel.value.amount)
const tipSource = computed(() => tipModel.value.source)
const tipTaxableDefault = computed(() => settingsData.value?.data?.tip_taxable_default === true)
const tenantTaxConfig = computed(() => settingsData.value?.data?.tax_config ?? null)
const tipTaxable = ref(false)
watch(() => tipAmount.value, (amt, prev) => {
  if (amt > 0 && !(prev && prev > 0)) tipTaxable.value = tipTaxableDefault.value
  if (amt === 0) tipTaxable.value = false
})
const tipTaxAmount = computed(() =>
  computeTipTaxAmount(tipAmount.value, tipTaxable.value, tenantTaxConfig.value),
)
const tipTaxLabel = computed(() => {
  const cfg = tenantTaxConfig.value
  if (cfg?.inc_applicable) return 'INC propina'
  if (cfg?.iva_applicable) return 'IVA propina'
  return 'Impuesto propina'
})
const checkoutTipBody = computed(() =>
  tipAmount.value > 0
    ? { tip_amount: tipAmount.value, tip_source: tipSource.value, tip_taxable: tipTaxable.value }
    : {},
)
// Reset when the session cart changes so a previous tip doesn't bleed into the next sale.
// Customer identity is attached at payment time — changing cliente must not wipe propina (#1030).
watch(() => posStore.cartId, () => {
  tipModel.value = { amount: 0, source: 'none' }
  tipTaxable.value = false
})

watch(() => posStore.cartServedByMemberId, (memberId) => {
  if (!memberId) tipModel.value = { amount: 0, source: 'none' }
})

// warocol.com#663 + #666 — checkout waiter picker before confirm
const waiterAttributionEnabled = computed(() => settingsData.value?.data?.waiter_attribution_enabled === true)
const tenantMembers = computed(() => settingsData.value?.data?.members ?? [])
const showCheckoutWaiterSelector = computed(() => {
  if (!tipEnabled.value) return false
  if (!waiterAttributionEnabled.value) return true
  // Mesa: always show so cashier can confirm/override effective session waiter (#666)
  if (isMesaMode.value) return true
  // Counter/bar: cart chip already set served_by — skip duplicate picker (#663)
  return !posStore.cartServedByMemberId
})
// Seed once from session effective waiter so dropdown defaults and body sends explicit id
const checkoutWaiterSeeded = ref(false)
const seedCheckoutWaiterFromSession = () => {
  if (!tipEnabled.value || checkoutWaiterSeeded.value || !isMesaMode.value) return
  const effectiveId = posStore.activeTableSession?.effectiveWaiterMemberId
  if (effectiveId && !posStore.cartServedByMemberId) {
    posStore.setCartServedBy(effectiveId)
    checkoutWaiterSeeded.value = true
  }
}
watch(
  () => posStore.activeTableSession?.effectiveWaiterMemberId,
  seedCheckoutWaiterFromSession,
  { immediate: true },
)
watch(tipEnabled, (enabled) => {
  if (enabled) return
  posStore.setCartServedBy(null)
  checkoutWaiterSeeded.value = false
})
const checkoutServedByBody = computed(() =>
  tipEnabled.value && posStore.cartServedByMemberId
    ? { served_by_member_id: posStore.cartServedByMemberId }
    : {},
)

// Counter mode: not a real table session (no mesa, no bar)
const isCounterMode = computed(() => !isMesaMode.value && !posStore.activeTableSession?.isBar)

// ── Delivery state ──────────────────────────────────────────────────────────
const addressStore = useAddressStore()
const deliveryEnabled = ref(false)
const deliveryInstructions = ref('')
const showAddressForm = ref(false)
const addressFormError = ref<string | null>(null)
const addressFormLoading = ref(false)

const mapTabItemToCheckoutLine = (item: (typeof storeTabItems.value)[number]) => {
  const raw = item as any
  return {
    orderItemId: item.orderItemId,
    promotionName: item.promotionName ?? raw.promotion_name ?? raw.locked_promotion_name ?? null,
    promoType: item.promoType ?? raw.promo_type ?? raw.locked_promo_type ?? null,
    promoSavings: Number(item.promoSavings ?? raw.promo_savings ?? raw.locked_promo_savings) || 0,
    promoOptOut: Boolean(item.promoOptOut ?? raw.promo_opt_out),
    product: {
      id: item.productId,
      name: item.productName,
      price: item.unitPrice,
      image: '🍽️',
      category: '',
    },
    modifiers: item.modifiers ?? [],
    quantity: item.quantity,
    notes: item.notes ?? undefined,
  }
}

// Computed (must be before any watchers that reference cartTotal)
const cartItems = computed(() => {
  if (isKitchenServiceMode.value) {
    const fromTab = storeTabItems.value.map(mapTabItemToCheckoutLine)
    if (fromTab.length > 0) return fromTab
    // Bar: cobrar con ítems aún en carrito (sin enviar a la cuenta)
    if (posStore.activeTableSession?.isBar && posStore.cart.length > 0) {
      return posStore.cart
    }
    return fromTab
  }
  return posStore.cart
})
const hasOrderLines = computed(
  () =>
    cartItems.value.length > 0
    || (!!posStore.activeTableSession && storeTabItems.value.length > 0),
)
const showEmptyCheckout = computed(
  () => !showSuccessModal.value && !isKitchenServiceMode.value && !hasOrderLines.value,
)

const checkoutDebugSnapshot = () => ({
  isBar: !!posStore.activeTableSession?.isBar,
  tableId: posStore.activeTableSession?.tableId ?? null,
  isKitchenServiceMode: isKitchenServiceMode.value,
  comandasEnabled: comandasEnabled.value,
  settingsAsyncStatus: settingsAsyncStatus.value,
  hasOrderLines: hasOrderLines.value,
  showEmptyCheckout: showEmptyCheckout.value,
  cartId: posStore.cartId,
  cartItems: posStore.cart.length,
  tabItems: storeTabItems.value.length,
  cartItemsComputed: cartItems.value.length,
  isLoading: isLoading.value,
  isSyncingCart: isSyncingCart.value,
  syncError: syncError.value || null,
  mesaCurrentStatus: mesaCurrentAsyncStatus.value,
})
const promoOptOutSignature = computed(() => {
  if (isKitchenServiceMode.value) {
    const tabSig = storeTabItems.value
      .map(item => `${item.orderItemId}:${item.promoOptOut ? 1 : 0}`)
      .join(',')
    if (tabSig) return tabSig
    return posStore.cart
      .map(item => `${item.id ?? ''}:${item.promo_opt_out ? 1 : 0}`)
      .join(',')
  }
  return posStore.cart
    .map(item => `${item.id ?? ''}:${item.promo_opt_out ? 1 : 0}`)
    .join(',')
})
const cartTotal = computed(() => {
  if (isKitchenServiceMode.value) {
    if (storeTabItems.value.length > 0) {
      return storeTabItems.value.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)
    }
    if (posStore.activeTableSession?.isBar && posStore.cart.length > 0) {
      return posStore.cartTotal
    }
    return posStore.activeTableSession?.runningTotal ?? 0
  }
  return posStore.cartTotal
})
const checkoutPromoPreview = computed<CheckoutPromoPreview | null>(() => {
  if (isKitchenServiceMode.value) {
    const session = mesaCurrentData.value?.data?.session
    if (!session) return null
    return {
      subtotal: cartTotal.value,
      promo_savings: Number(session.promo_savings) || 0,
      subtotal_after_promos: Number(session.subtotal_after_promos ?? session.running_total) || 0,
      promo_breakdown: session.promo_breakdown ?? [],
    }
  }
  return posTaxPreviewData.value as CheckoutPromoPreview | null
})
const promoBreakdown = computed(() => checkoutPromoPreview.value?.promo_breakdown ?? [])
const promoLineById = computed(() => {
  const map = new Map<string, PromoPreviewLine>()
  for (const line of checkoutPromoPreview.value?.lines ?? []) {
    map.set(String(line.id), line)
  }
  return map
})

type CheckoutPromoLineItem = {
  product: { id: string; price: number }
  modifiers?: Array<{ id: string; price: number; quantity?: number }>
  quantity: number
  orderItemId?: string
}

function checkoutLineGross(item: CheckoutPromoLineItem): number {
  if (isKitchenServiceMode.value) {
    const tab = storeTabItems.value.find(t => t.orderItemId === item.orderItemId)
    if (tab) return tab.subtotal
  }
  const base = Number(item.product.price) || 0
  const mods = (item.modifiers ?? []).reduce(
    (sum, mod) => sum + Number(mod.price) * (mod.quantity ?? 1),
    0,
  )
  return (base + mods) * (Number(item.quantity) || 1)
}

function checkoutLineEligibleSubtotal(item: CheckoutPromoLineItem): number {
  return computePromoEligibleSubtotal(
    Number(item.product.price) || 0,
    item.modifiers ?? [],
    posStore.getProduct(item.product.id)?.modifier_groups ?? [],
    Number(item.quantity) || 1,
  )
}

function checkoutLineCategoryId(item: { product: { id: string }; orderItemId?: string }): string | null {
  const tab = storeTabItems.value.find(t => t.orderItemId === item.orderItemId)
  if (tab?.categoryId) return tab.categoryId
  return posStore.getProduct(item.product.id)?.category_id ?? null
}

/** When tax-preview / mesa session omit promo_savings, mirror Orden Actual client eval. */
const clientPromoSavings = computed(() => {
  let total = 0
  for (const item of cartItems.value) {
    if (Boolean(item.promo_opt_out ?? item.promoOptOut)) continue

    const lineId = String(item.orderItemId ?? item.id ?? '')
    const previewLine = lineId ? promoLineById.value.get(lineId) : undefined
    const previewSavings = Number(
      previewLine?.promo_savings
      ?? previewLine?.promoSavings
      ?? previewLine?.locked_promo_savings
    ) || 0

    if (isKitchenServiceMode.value) {
      const fromTab = Number(item.promoSavings) || 0
      if (fromTab > 0) {
        total += fromTab
        continue
      }
    } else if (previewSavings > 0) {
      total += previewSavings
      continue
    } else {
      const fromLine = Number(item.promoSavings) || 0
      if (fromLine > 0) {
        total += fromLine
        continue
      }
    }

    const productId = item.product?.id
    if (!productId || activePromos.value.length === 0) continue
    total += linePromoSavingsForProduct(
      activePromos.value,
      productId,
      {
        subtotal: checkoutLineGross(item),
        eligibleSubtotal: checkoutLineEligibleSubtotal(item),
        quantity: item.quantity,
      },
      checkoutLineCategoryId(item),
      promoPickOptions.value,
    )
  }
  return total
})

const promoSavings = computed(() => {
  const fromApi = Number(checkoutPromoPreview.value?.promo_savings) || 0
  return fromApi > 0 ? fromApi : clientPromoSavings.value
})

const subtotalAfterPromos = computed(() => {
  const preview = checkoutPromoPreview.value
  const fromApi = Number(checkoutPromoPreview.value?.promo_savings) || 0
  if (fromApi > 0 && preview?.subtotal_after_promos != null) {
    return Number(preview.subtotal_after_promos)
  }
  return Math.max(0, cartTotal.value - promoSavings.value)
})

const displayPromoBreakdown = computed(() => {
  if (promoBreakdown.value.length > 0) return promoBreakdown.value
  if (promoSavings.value <= 0) return []
  const name = activePromoHint.value || 'Promoción'
  return [{ promotion_name: name, promo_type: '', savings: promoSavings.value }]
})

/** Promo lines for prefactura snapshot, orderResult, and printed receipt — mirrors checkout summary. */
function promoFieldsForReceipt(subtotal: number) {
  if (promoSavings.value <= 0) return {}
  return {
    promo_savings: promoSavings.value,
    promo_breakdown: displayPromoBreakdown.value.map(p => ({ ...p })),
    subtotal,
  }
}

function promoFieldsFromCloseResponse(
  data: { promo_savings?: number; promo_breakdown?: PromoBreakdownLine[]; subtotal?: number | null } | null | undefined,
  fallbackSubtotal: number,
) {
  const savings = Number(data?.promo_savings) || 0
  if (savings <= 0) return {}
  const breakdown = data?.promo_breakdown?.length
    ? data.promo_breakdown
    : [{ promotion_name: 'Promoción', promo_type: '', savings }]
  return {
    promo_savings: savings,
    promo_breakdown: breakdown,
    subtotal: Number(data?.subtotal) || fallbackSubtotal,
  }
}
// Manual checkout contract (#1397): automatic promos are evaluated first;
// manual discounts use subtotalAfterPromos, then WaRo redemption is applied.
const discountAmount = computed(() => {
  if (!discountEnabled.value || !discountInput.value) return 0
  const val = Number(discountInput.value)
  if (isNaN(val) || val <= 0) return 0
  // POS contract: automatic line promos reduce subtotalAfterPromos first;
  // manual fixed/percent discounts are order-level discounts on that subtotal.
  if (discountType.value === 'percent') {
    return Math.min(Math.round(subtotalAfterPromos.value * val / 100), Math.round(subtotalAfterPromos.value))
  }
  return Math.min(Math.round(val), Math.round(subtotalAfterPromos.value))
})
const discountInputNumber = computed(() => Number(discountInput.value))
const discountValidationError = computed(() => {
  if (!discountEnabled.value || !discountInput.value) return ''
  const val = discountInputNumber.value
  if (!Number.isFinite(val) || val <= 0) {
    return 'Ingresa un descuento mayor a 0'
  }
  if (discountType.value === 'percent') {
    if (val > 100) return 'El descuento porcentual no puede superar el 100%'
    return ''
  }
  const maxFixedDiscount = Math.round(subtotalAfterPromos.value)
  if (maxFixedDiscount <= 0) {
    return 'No hay subtotal disponible para aplicar descuento'
  }
  if (Math.round(val) > maxFixedDiscount) {
    return `El descuento fijo no puede superar $${maxFixedDiscount.toLocaleString('es-CO')}`
  }
  return ''
})
const manualDiscountIsValid = computed(() => !discountValidationError.value)

function toggleManualDiscount() {
  discountEnabled.value = !discountEnabled.value
  if (!discountEnabled.value) {
    discountInput.value = ''
    processingError.value = ''
  }
}

function selectDiscountType(type: 'percent' | 'fixed') {
  discountType.value = type
  discountInput.value = ''
  processingError.value = ''
}

function clearManualDiscount() {
  discountInput.value = ''
  processingError.value = ''
}
const {
  preview: waroPreview,
  isLoading: isLoadingWaroPreview,
  error: waroPreviewError,
  schedulePreview,
  resetPreview: resetWaroPreview,
} = useWaroRedemptionPreview()
const waroDiscountCop = computed(() => Number(waroPreview.value?.total_waro_discount_cop) || 0)
const combinedDiscountForTax = computed(() => discountAmount.value + waroDiscountCop.value)
const discountedTotal = computed(() =>
  Math.max(0, subtotalAfterPromos.value - discountAmount.value - waroDiscountCop.value),
)
// warocol.com#639 — final amount charged to the customer when tipping is enabled.
// total_amount on orders never includes tip (tax-base invariant from migration 079);
// charged_amount = total_amount + tip_amount lives at the payment layer only.
const finalChargedAmount = computed(() =>
  discountedTotal.value + tipSettlementTotal(tipAmount.value, tipTaxAmount.value),
)

// ── Parallel-loading queries (replaces manual refreshTaxPreview + #656 rehydration $fetch).
//
// Mesa session — ONE query covers tax preview, running total, AND the #656
// partial_payments rehydration. Replaces the legacy refreshTaxPreview mesa
// branch and the manual rehydration $fetch in onMounted.
const {
  data: mesaCurrentData,
  asyncStatus: mesaCurrentAsyncStatus,
  error: mesaCurrentError,
} = useQuery({
  key: () => ['tables', posStore.activeTableSession?.tableId ?? null, 'current', promoOptOutSignature.value],
  query: () => $fetch<{ success: boolean; data: any }>(
    `/api/tables/${posStore.activeTableSession!.tableId}/current`
  ),
  enabled: () => isKitchenServiceMode.value && !!posStore.activeTableSession?.tableId,
  staleTime: 5_000,  // short — running_total changes when items are added
})

const {
  data: checkoutComandasData,
  asyncStatus: checkoutComandasAsyncStatus,
} = useQuery({
  key: () => ['tables', posStore.activeTableSession?.tableId ?? null, posStore.activeTableSession?.sessionId ?? null, 'comandas'],
  query: () => $fetch<{ success: boolean; data?: { comandas?: unknown[] } }>(
    `/api/tables/${posStore.activeTableSession!.tableId}/comandas`
  ),
  enabled: () => comandasEnabled.value && isKitchenServiceMode.value && !!posStore.activeTableSession?.tableId,
  staleTime: 5_000,
})

const persistedComandasRaw = ref<unknown[]>([])
const comandasForPrint = ref<ComandaPrintPayload[]>([])
const selectedComandaIds = ref<string[]>([])
const comandaSelectionInitialized = ref(false)
const comandaPrintSessionKey = ref<string | null>(null)
const posBusinessName = computed(
  () => settingsData.value?.data?.business_name
    ?? settingsData.value?.data?.display_name
    ?? 'WARO',
)

const currentComandaPrintSessionKey = () => {
  const session = posStore.activeTableSession
  return session ? `${session.tableId}:${session.sessionId ?? ''}` : null
}

function resetComandaPrintState() {
  persistedComandasRaw.value = []
  comandasForPrint.value = []
  selectedComandaIds.value = []
  comandaSelectionInitialized.value = false
  comandaPrintSessionKey.value = null
}

const canPrintComandas = computed(
  () =>
    comandasForPrint.value.length > 0
    && comandaPrintSessionKey.value === currentComandaPrintSessionKey(),
)

function rawComandaId(raw: unknown, index: number): string {
  const c = raw as Record<string, unknown>
  return String(c.id ?? `${c.comanda_number ?? index}:${c.station_name ?? ''}:${c.fired_at ?? ''}`)
}

const comandasForPrintDisplay = computed(() => {
  if (!canPrintComandas.value) return []
  const sel = selectedComandaIds.value
  if (sel.length === 0) return []
  const selSet = new Set(sel)
  const filteredRaw = (persistedComandasRaw.value as Record<string, unknown>[])
    .filter((c, index) => selSet.has(rawComandaId(c, index)))
  return mapComandasForPrint(filteredRaw)
})

const sentComandasForCheckout = computed(() => (
  (persistedComandasRaw.value as Record<string, unknown>[]).map((c, index) => {
    const items = ((c.items as Record<string, unknown>[]) ?? [])
    return {
      id: rawComandaId(c, index),
      comandaNumber: String(c.comanda_number ?? '—'),
      stationName: (c.station_name as string) ?? 'Sin cocina asignada',
      status: String(c.status ?? ''),
      firedAt: c.fired_at != null ? String(c.fired_at) : null,
      itemCount: items.length,
      itemPreview: items
        .slice(0, 2)
        .map(i => `${Number(i.quantity ?? 1)}x ${String(i.kitchen_name ?? '')}`.trim())
        .filter(Boolean)
        .join(', '),
    }
  })
))

const selectedComandaCount = computed(() => selectedComandaIds.value.length)
const checkoutComandasLoading = computed(() =>
  checkoutComandasAsyncStatus.value === 'loading' && !checkoutComandasData.value
)
const showCheckoutComandas = computed(() => comandasEnabled.value && isKitchenServiceMode.value)
const checkoutComandasPrintLabel = computed(() => {
  const n = selectedComandaCount.value
  if (n > 0 && n < sentComandasForCheckout.value.length) return `Reimprimir seleccionadas (${n})`
  return 'Reimprimir comandas'
})

function applyPersistedComandas(rawComandas: unknown[], preserveSelection = true) {
  const printableRaw = (rawComandas as Record<string, unknown>[])
    .filter(c => (((c.items as unknown[]) ?? []).length > 0))
  const ids = printableRaw.map((c, index) => rawComandaId(c, index))
  const hadComandas = persistedComandasRaw.value.length > 0
  persistedComandasRaw.value = printableRaw
  comandasForPrint.value = mapComandasForPrint(printableRaw)
  comandaPrintSessionKey.value = currentComandaPrintSessionKey()

  if (preserveSelection && comandaSelectionInitialized.value && hadComandas) {
    const available = new Set(ids)
    selectedComandaIds.value = selectedComandaIds.value.filter(id => available.has(id))
  } else {
    selectedComandaIds.value = ids
    comandaSelectionInitialized.value = ids.length > 0
  }
}

watch(
  () => checkoutComandasData.value?.data?.comandas,
  (rows) => applyPersistedComandas(Array.isArray(rows) ? rows : []),
  { immediate: true },
)

watch(
  [showCheckoutComandas, () => posStore.activeTableSession?.tableId, () => posStore.activeTableSession?.sessionId],
  ([enabled, tableId, sessionId], previous) => {
    if (!enabled) {
      resetComandaPrintState()
      return
    }
    if (!previous) return
    const [, previousTableId, previousSessionId] = previous
    if (tableId !== previousTableId || sessionId !== previousSessionId) {
      resetComandaPrintState()
    }
  },
)

function toggleComandaSelection(comandaId: string) {
  comandaSelectionInitialized.value = true
  const idx = selectedComandaIds.value.indexOf(comandaId)
  if (idx >= 0) {
    selectedComandaIds.value = selectedComandaIds.value.filter(id => id !== comandaId)
  } else {
    selectedComandaIds.value = [...selectedComandaIds.value, comandaId]
  }
}

function formatComandaTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function statusLabel(status?: string): string | null {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    preparing: 'Preparando',
    ready: 'Lista',
    delivered: 'Entregada',
  }
  return status ? labels[status] ?? status : null
}

function handlePrintComandas() {
  if (!comandasForPrintDisplay.value.length) return
  printComandaTickets()
}

// POS tax preview — manual + WaRo discounts are folded into discount_amount (#1063).
const { data: posTaxPreviewData } = useQuery({
  key: () => ['pos', 'cart', posStore.cartId ?? null, 'tax-preview', combinedDiscountForTax.value, promoOptOutSignature.value],
  query: () => {
    const params = new URLSearchParams()
    if (combinedDiscountForTax.value > 0) {
      params.set('discount_amount', String(combinedDiscountForTax.value))
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    return $fetch<{
      standard_tax: number
      liquor_tax: number
      standard_tax_label: string
      subtotal?: number
      promo_savings?: number
      subtotal_after_promos?: number
      promo_breakdown?: CheckoutPromoPreview['promo_breakdown']
      lines?: PromoPreviewLine[]
    }>(
      `/api/pos/cart/${posStore.cartId}/tax-preview${qs}`
    )
  },
  enabled: () => !isKitchenServiceMode.value && !!posStore.cartId,
  staleTime: 5_000,
})

// Tax preview derived from whichever query is active (mesa vs POS).
// Replaces the manually-managed taxPreview ref + refreshTaxPreview function.
const taxPreview = computed<TaxPreview | null>(() => {
  if (isKitchenServiceMode.value) {
    const session = mesaCurrentData.value?.data?.session
    if (!session) return null
    return {
      standard_tax: Number(session.standard_tax) || 0,
      liquor_tax: Number(session.liquor_tax) || 0,
      standard_tax_label: session.standard_tax_label || 'Impuesto',
    }
  }
  const data = posTaxPreviewData.value
  if (!data) return null
  return {
    standard_tax: Number(data.standard_tax) || 0,
    liquor_tax: Number(data.liquor_tax) || 0,
    standard_tax_label: data.standard_tax_label || 'Impuesto',
  }
})

// Tax preview is auto-recomputed via useQuery (mesaCurrentData / posTaxPreviewData)
// — discount/cart changes invalidate the query keys, no manual debounce needed.

// warocol.com#715 — QR accept payment intent + tab sync on checkout
const paymentPrefillSeeded = ref(false)

function mapTabItemsFromApi(rows: any[]): TabItem[] {
  return rows.map((i: any) => ({
    orderItemId: i.id,
    productId: i.productId,
    categoryId: i.categoryId ?? null,
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.subtotal,
    promotionName: i.promotionName ?? i.promotion_name ?? i.locked_promotion_name ?? null,
    promoType: i.promoType ?? i.promo_type ?? i.locked_promo_type ?? null,
    promoSavings: Number(i.promoSavings ?? i.promo_savings ?? i.locked_promo_savings) || 0,
    promoOptOut: Boolean(i.promoOptOut ?? i.promo_opt_out),
    modifiers: (i.modifiers ?? []).map((m: any) => ({
      id: m.id ?? '',
      name: m.name,
      price: Number(m.price) || 0,
      quantity: Number(m.quantity) || 1,
    })),
    notes: i.notes ?? null,
    fulfillmentStatus: i.fulfillmentStatus ?? 'new',
    sentAt: i.sentAt ?? null,
  }))
}

function seedPaymentFromTableQr() {
  if (paymentPrefillSeeded.value || !isMesaMode.value || !posPaymentGroups.value.length) return

  const tableId = posStore.activeTableSession?.tableId
  if (!tableId) return

  const intent = readTableQrPaymentIntent(tableId)
  if (intent?.payment_method) {
    const group = posPaymentGroups.value.find(g => g.slug === intent.payment_method)
    if (group) {
      selectedPaymentMethod.value = intent.payment_method
      if (
        intent.payment_method_id
        && group.methods?.some(m => m.id === intent.payment_method_id)
      ) {
        selectedPaymentMethodId.value = intent.payment_method_id
      }
      clearTableQrPaymentIntent(tableId)
      paymentPrefillSeeded.value = true
      return
    }
  }

  const orders = mesaCurrentData.value?.data?.orders as Array<{
    status?: string
    payment_method?: string
  }> | undefined
  const pending = orders?.find(o => o.status === 'pending' && o.payment_method)
  if (pending?.payment_method) {
    const group = posPaymentGroups.value.find(g => g.slug === pending.payment_method)
    if (group) {
      selectedPaymentMethod.value = pending.payment_method
      paymentPrefillSeeded.value = true
    }
  }
}

watch(
  [
    () => posPaymentGroups.value.length,
    () => mesaCurrentData.value?.data?.orders,
    () => posStore.activeTableSession?.tableId,
  ],
  seedPaymentFromTableQr,
  { immediate: true },
)

watch(
  () => mesaCurrentData.value?.data?.tab_items,
  (rows) => {
    if (!isKitchenServiceMode.value || !rows?.length) return
    posStore.setTabItems(mapTabItemsFromApi(rows))
  },
)

// Split payment state
const splitMode = ref(false)
// warocol.com#735 + #737 — propina tras mesero; editable until first partial is posted
const showCheckoutTipSelector = computed(
  () => tipEnabled.value && !!posStore.cartServedByMemberId && splitPayments.value.length === 0,
)
const splitPayments = ref<ReceiptPaymentLine[]>([])
const splitPaidTotal = ref(0)
// Issue warocol.com#649 — void partial payment state: modal + per-row spinner.
// The reason is optional (audit-only); empty string is accepted by the backend.
const isVoidingPayment = ref<string | null>(null)
const voidPaymentTarget = ref<{ id: string; amount: number; payment_method: string; payment_method_name: string } | null>(null)
const voidPaymentReason = ref('')
const voidPaymentError = ref('')
const splitAmountDue = computed(() =>
  discountedTotal.value + tipSettlementTotal(tipAmount.value, tipTaxAmount.value),
)
const splitRemaining = computed(() => Math.max(0, splitAmountDue.value - splitPaidTotal.value))
const splitIsComplete = computed(() => splitRemaining.value <= 0.01)

const onSplitAmountInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const raw = Number(input.value.replace(/\./g, '').replace(/\D/g, ''))
  splitPartialAmount.value = raw || null
  cashReceivedInput.value = 0
  input.value = raw ? raw.toLocaleString('es-CO') : ''
}
const isAddingPayment = ref(false)
const splitPartialAmount = ref<number | null>(null)

// Issue warocol.com#649 — the partial amount input is always reset after each
// payment lands and when split mode toggles. The cashier must explicitly type
// the next partial — no auto-fill — avoids confusion with stale values like
// "$1.100" sitting in the field after a payment was already submitted.
watch(splitMode, (val) => {
  cashReceivedInput.value = 0
  if (val) {
    splitPartialAmount.value = null
    activeAccordion.value = null
  }
})

// Issue warocol.com#656 — toggle split mode without dropping splitPayments
// when there are already-committed partials. The previous inline handler
// reset the array unconditionally, which on a freshly-rehydrated checkout
// would visually erase the DB-backed partials and lead to a double-charge.
// When the cashier toggles off with partials present, we only hide the panel.
const toggleSplitMode = () => {
  const next = !splitMode.value
  if (!next && splitPayments.value.length > 0) {
    splitMode.value = false
    return
  }
  splitMode.value = next
  if (!next) {
    splitPayments.value = []
    splitPaidTotal.value = 0
  }
}

const splitAmountValidationMessage = computed(() => {
  if (!splitMode.value || splitIsComplete.value) return ''
  const amount = splitPartialAmount.value
  if (amount === null) return ''
  if (amount <= 0) return 'Ingresa un monto mayor a $0.'
  if (amount - splitRemaining.value > 0.01) {
    return `El monto supera el saldo pendiente (${formatCurrency(splitRemaining.value)}).`
  }
  return ''
})

const splitPaymentValidationMessage = computed(
  () => splitAmountValidationMessage.value,
)

const splitAmountToCharge = computed(() =>
  splitPartialAmount.value !== null
  && splitPartialAmount.value > 0
  && !splitAmountValidationMessage.value
    ? splitPartialAmount.value
    : 0
)

const addSplitPayment = async () => {
  if ((!isKitchenServiceMode.value && !posStore.cartId) || !selectedPaymentMethod.value || !selectedCustomer.value) {
    processingError.value = 'Selecciona método de pago y cliente antes de continuar'
    return
  }
  if (!manualDiscountIsValid.value) {
    processingError.value = discountValidationError.value
    return
  }
  if (splitPaymentValidationMessage.value) {
    processingError.value = splitPaymentValidationMessage.value
    return
  }
  const amountToCharge = splitAmountToCharge.value
  if (amountToCharge <= 0) {
    processingError.value = 'Ingresa un monto a cobrar antes de registrar el pago'
    return
  }
  isAddingPayment.value = true
  processingError.value = ''
  if (!(await ensureWalletTenderCanPay(amountToCharge))) {
    isAddingPayment.value = false
    return
  }

  try {
    let paidTotal = 0
    let remaining = 0
    let isComplete = false
    let paymentId = ''
    let completionData: any = null

    if (isKitchenServiceMode.value) {
      const session = posStore.activeTableSession!
      if (splitPayments.value.length === 0) {
        // First payment: close mesa with split_mode=true (marks orders partial, keeps session open)
        const _discountAmtMesa = discountAmount.value
        const response = await $fetch(`/api/tables/${session.tableId}/close`, {
          method: 'POST',
          body: {
            payment_method: selectedPaymentMethod.value,
            customer_id: selectedCustomer.value.id,
            payment_method_id: selectedPaymentMethodId.value ?? null,
            ...(discountEnabled.value && _discountAmtMesa > 0
              ? { discount_type: discountType.value, discount_value: Number(discountInput.value) }
              : {}),
            split_mode: true,
            split_first_amount: amountToCharge,
            // Issue #524 — cash tender on the first split when method is cash
            ...(isCashMethod.value
              ? { split_first_cash_received: Number(cashReceivedInput.value) }
              : {}),
            ...checkoutServedByBody.value,
            ...checkoutTipBody.value,
            ...checkoutWaroBody.value,
          }
        }) as any
        paidTotal = response.data.paid_total ?? amountToCharge
        remaining = response.data.remaining ?? (splitAmountDue.value - amountToCharge)
        isComplete = response.data.is_complete ?? false
        if (isComplete) completionData = response.data
        // Issue warocol.com#649 — real UUID from backend so the trash button can DELETE it.
        paymentId = response.data.payment_id
      } else {
        // Subsequent payments
        const response = await $fetch(`/api/tables/${session.tableId}/payments`, {
          method: 'POST',
          body: {
            amount: amountToCharge,
            payment_method: selectedPaymentMethod.value,
            payment_method_id: selectedPaymentMethodId.value ?? null,
            ...(isCashMethod.value
              ? { cash_received: Number(cashReceivedInput.value) }
              : {}),
          }
        }) as any
        paidTotal = response.data.paid_total
        remaining = response.data.remaining
        isComplete = response.data.is_complete
        if (isComplete) completionData = response.data
        // Issue warocol.com#649 — backend always returns a real UUID; no fallback.
        paymentId = response.data.payment_id
      }
    } else {
      if (splitPayments.value.length === 0) {
        // First payment: create the order in partial state via /complete
        const _discountAmtPos = discountAmount.value
        const response = await $fetch(`/api/pos/cart/${posStore.cartId}/complete`, {
          method: 'POST',
          body: {
            payment_method: selectedPaymentMethod.value,
            customer_id: selectedCustomer.value.id,
            payment_method_id: selectedPaymentMethodId.value ?? null,
            ...(discountEnabled.value && _discountAmtPos > 0
              ? { discount_type: discountType.value, discount_value: Number(discountInput.value) }
              : {}),
            // POS split contract: first tender creates a partial order; later
            // tenders go to /payments and are the source of truth in order_payments.
            split_mode: true,
            split_first_amount: amountToCharge,
            // Issue #524 — cash tender on the first split when method is cash
            ...(isCashMethod.value
              ? { split_first_cash_received: Number(cashReceivedInput.value) }
              : {}),
            ...checkoutServedByBody.value,
            ...checkoutTipBody.value,
            ...checkoutWaroBody.value,
          }
        }) as any
        paidTotal = response.data.paid_total ?? amountToCharge
        remaining = response.data.remaining ?? (splitAmountDue.value - amountToCharge)
        isComplete = response.data.is_complete ?? false
        if (isComplete) completionData = response.data
        // Issue warocol.com#649 — backend always returns a real UUID; no fallback.
        paymentId = response.data.payment_id
      } else {
        // Subsequent payments: add to existing order
        const response = await $fetch(`/api/pos/cart/${posStore.cartId}/payments`, {
          method: 'POST',
          body: {
            amount: amountToCharge,
            // Wallet participates here as payment_method='customer_wallet',
            // never as a discount and never with cash_received.
            payment_method: selectedPaymentMethod.value,
            payment_method_id: selectedPaymentMethodId.value ?? undefined,
            ...(isCashMethod.value
              ? { cash_received: Number(cashReceivedInput.value) }
              : {}),
          }
        }) as any
        paidTotal = response.data.paid_total
        remaining = response.data.remaining
        isComplete = response.data.is_complete
        if (isComplete) completionData = response.data
        paymentId = response.data.payment_id
      }
    }

    const subMethodName = selectedPaymentMethodId.value
      ? selectedGroup.value?.methods.find(m => m.id === selectedPaymentMethodId.value)?.name
      : undefined
    const cashReceived = isCashMethod.value && cashReceivedInput.value > 0
      ? Number(cashReceivedInput.value)
      : null
    const paymentChange = cashReceived !== null
      ? Math.max(0, cashReceived - amountToCharge)
      : null
    splitPayments.value.push({
      id: paymentId,
      amount: amountToCharge,
      payment_method: selectedPaymentMethod.value,
      payment_method_id: selectedPaymentMethodId.value ?? null,
      payment_method_name: subMethodName ?? getPaymentMethodLabel(selectedPaymentMethod.value),
      ...(cashReceived !== null ? { cash_received: cashReceived, change: paymentChange } : {}),
    })
    splitPaidTotal.value = paidTotal
    cashReceivedInput.value = 0
    // Issue warocol.com#649 — reset partial so next iteration starts at 0.
    splitPartialAmount.value = null
    if (isKitchenServiceMode.value) {
      cache.invalidateQueries({
        key: ['tables', posStore.activeTableSession?.tableId ?? null, 'current'],
      })
    }

    if (isComplete) {
      const completeData = completionData ?? {}
      captureReceiptPrintContext()
      orderResult.value = {
        order_id: completeData.order_id,
        order_ids: completeData.order_ids,
        order_number: Number(completeData.order_number) || 0,
        order_numbers: completeData.order_numbers,
        total_amount: Number(completeData.total_amount ?? discountedTotal.value),
        payment_method: completeData.payment_method ?? selectedPaymentMethod.value,
        status: completeData.status,
        payment_status: completeData.payment_status,
        ...promoFieldsForReceipt(cartTotal.value),
        ...(discountEnabled.value && discountAmount.value > 0
          ? { discount_amount: discountAmount.value, subtotal: cartTotal.value }
          : {}),
        standard_tax: Number(completeData.standard_tax ?? taxPreview.value?.standard_tax ?? 0),
        liquor_tax: Number(completeData.liquor_tax ?? taxPreview.value?.liquor_tax ?? 0),
        standard_tax_label: completeData.standard_tax_label ?? taxPreview.value?.standard_tax_label ?? 'Impuesto',
        ...(tipAmount.value > 0
          ? {
              tip_amount: Number(completeData.tip_amount ?? tipAmount.value),
              charged_amount: Number(completeData.charged_amount ?? splitAmountDue.value),
            }
          : {}),
        ...waroOrderResultFields(completeData.waro_redemption_summary, cartTotal.value),
      }
      cartItemsSnapshot.value = [...cartItems.value]
      receiptEmail.value = ''
      emailSent.value = false
      emailFromProfile.value = false
      splitMode.value = false
      posStore.clearAll()
      showSuccessModal.value = true
      document.body.classList.remove('printing-prefactura')
      prefacturaPrintSnapshot.value = null
    }
  } catch (e: any) {
    processingError.value = checkoutErrorMessage(e, 'Error al registrar el pago parcial')
  } finally {
    isAddingPayment.value = false
  }
}

// Issue warocol.com#649 — void an already-registered partial payment.
// Click on the trash icon opens a confirmation modal (no prompt/alert).
// The motivo is optional; an empty value is accepted by the backend.
const openVoidPaymentModal = (p: { id: string; amount: number; payment_method: string; payment_method_name: string }) => {
  if (isVoidingPayment.value) return
  voidPaymentTarget.value = p
  voidPaymentReason.value = ''
  voidPaymentError.value = ''
}

const closeVoidPaymentModal = () => {
  if (isVoidingPayment.value) return
  voidPaymentTarget.value = null
  voidPaymentReason.value = ''
  voidPaymentError.value = ''
}

const confirmVoidPayment = async () => {
  const p = voidPaymentTarget.value
  if (!p || isVoidingPayment.value) return

  isVoidingPayment.value = p.id
  voidPaymentError.value = ''
  try {
    const endpoint = isKitchenServiceMode.value
      ? `/api/tables/${posStore.activeTableSession!.tableId}/payments/${p.id}`
      : `/api/pos/cart/${posStore.cartId}/payments/${p.id}`
    const res = await $fetch(endpoint, {
      method: 'DELETE',
      body: { reason: voidPaymentReason.value.trim() || null },
    }) as any
    const voidedIds: string[] = res.data?.voided_ids ?? [p.id]
    splitPayments.value = splitPayments.value.filter(row => !voidedIds.includes(row.id))
    splitPaidTotal.value = Number(res.data?.paid_total ?? 0)
    splitPartialAmount.value = null
    if (isKitchenServiceMode.value) {
      cache.invalidateQueries({
        key: ['tables', posStore.activeTableSession?.tableId ?? null, 'current'],
      })
    }
    voidPaymentTarget.value = null
    voidPaymentReason.value = ''
  } catch (e: any) {
    // Surface whatever the backend returned (FastAPI puts validation errors in
    // e.data.detail; APIError instances put text in e.data.message). Falls back
    // to the HTTP status + message so the cashier sees something actionable.
    const beMessage = e?.data?.message
      ?? (Array.isArray(e?.data?.detail) ? e.data.detail.map((d: any) => d.msg ?? JSON.stringify(d)).join('; ') : e?.data?.detail)
      ?? e?.statusMessage
      ?? e?.message
    voidPaymentError.value = beMessage || 'No se pudo eliminar el pago'
    // eslint-disable-next-line no-console
    console.error('[#649] void payment failed', { status: e?.status, statusCode: e?.statusCode, data: e?.data, message: e?.message })
  } finally {
    isVoidingPayment.value = null
  }
}

// Waros + wallet (#1063)
const { summary: warosSummary, isLoadingSummary: isLoadingWaros, fetchSummary: fetchWarosSummary, resetSummary } = useWarosCliente()
const { estimatedWaros, earnEligible: warosEarnEligible, isLoadingEstimate, systemEnabled: warosSystemEnabled, fetchEstimate, resetEstimate } = useWarosEstimate()
const selectedWaroReward = ref<WaroReward | null>(null)
const warosBalance = computed(() => warosSummary.value?.current_balance ?? 0)
const isAnonymousCustomer = computed(() => selectedCustomer.value?.phone_number === '0000000000')
const customerIdRef = computed(() => selectedCustomer.value?.id ?? '')
const { wallet: customerWallet, isLoading: isLoadingWallet, isRefreshing: isRefreshingWallet, refetch: refetchWallet } =
  useCustomerWallet(customerIdRef)
const walletBalanceCop = computed(() => customerWallet.value?.balance_cop ?? 0)
const isWalletPending = computed(() => isLoadingWallet.value || isRefreshingWallet.value)
const { config: redemptionConfig } = useRedemptionConfig()
const {
  rewards: waroRewardsCatalog,
  isLoading: isLoadingWaroRewardsCatalog,
  fetchRewards: fetchWaroRewardsCatalog,
  refreshRewards: refreshWaroRewardsCatalog,
} = useWaroRewards()

const activeWaroRewards = computed(() =>
  waroRewardsCatalog.value.filter(r => r.is_active),
)

const waroRewardLabel = computed(() => {
  if (selectedWaroReward.value) return selectedWaroReward.value.name
  return waroPreview.value?.reward_name ?? null
})

function waroFieldsFromSummary(summary: WaroRedemptionSummary | null | undefined) {
  if (!summary) return {}
  const waro_discount_cop = Number(summary.waro_discount_cop) || 0
  const breakdown = summary.waro_breakdown ?? []
  if (waro_discount_cop <= 0 && breakdown.length === 0) return {}
  const reward_name = breakdown.find(b => b.reward_name)?.reward_name ?? null
  return {
    waro_discount_cop,
    waro_reward_name: reward_name,
    waro_redemption_summary: {
      waro_discount_cop,
      waros_spent: summary.waros_spent ?? breakdown.reduce((sum, row) => sum + (Number(row.waros_spent) || 0), 0),
      waro_breakdown: breakdown,
    },
  }
}

function waroFieldsFromPreview() {
  const waro_discount_cop = waroDiscountCop.value
  if (waro_discount_cop <= 0) return {}
  const preview = waroPreview.value
  const reward_name = waroRewardLabel.value
  const waro_breakdown: WaroRedemptionBreakdownLine[] = []
  if (preview?.reward_name || preview?.waro_reward_id) {
    waro_breakdown.push({
      redemption_type: preview.reward_type ?? 'reward_fixed_cop',
      waros_spent: preview.total_waros_cost ?? undefined,
      cop_discount: waro_discount_cop,
      waro_reward_id: preview.waro_reward_id,
      reward_name: preview.reward_name ?? reward_name,
    })
  }
  return {
    waro_discount_cop,
    waro_reward_name: reward_name,
    waro_redemption_summary: {
      waro_discount_cop,
      waros_spent: preview?.total_waros_cost ?? 0,
      waro_breakdown,
    },
  }
}

function waroFieldsFromApiOrPreview(summary?: WaroRedemptionSummary | null) {
  const fromApi = waroFieldsFromSummary(summary)
  if (fromApi.waro_discount_cop) return fromApi
  return waroFieldsFromPreview()
}

function waroOrderResultFields(
  summary: WaroRedemptionSummary | null | undefined,
  fallbackSubtotal?: number,
) {
  const waro = waroFieldsFromApiOrPreview(summary)
  if (!waro.waro_discount_cop) return waro
  return { ...waro, subtotal: fallbackSubtotal }
}

const waroRedemptionEnabled = computed(() => {
  const cfg = redemptionConfig.value
  if (!cfg?.is_enabled) return false
  return Boolean(cfg.redemption_enabled)
})

/** Stable gate for the WaRo accordion — do not tie to estimate mutation (it resets and flickers). */
const warosPanelVisible = computed(() => {
  if (!selectedCustomer.value || isAnonymousCustomer.value) return false
  if (redemptionConfig.value == null) return true
  return redemptionConfig.value.is_enabled
})

const warosEarnBlockVisible = computed(
  () => warosPanelVisible.value && (warosSystemEnabled.value !== false),
)

function buildRedemptionPromoLines(): PromoLineForRedemption[] {
  return cartItems.value
    .map(item => ({
      id: String(item.orderItemId ?? item.id ?? ''),
      product_id: String(item.product?.id ?? ''),
      category_id: checkoutLineCategoryId(item),
      quantity: Number(item.quantity) || 1,
      subtotal: checkoutLineGross(item),
      promo_eligible_subtotal: checkoutLineEligibleSubtotal(item),
      promo_opt_out: Boolean(item.promo_opt_out ?? item.promoOptOut),
    }))
    .filter(line => line.id && line.product_id)
}

function refreshWaroPreview() {
  if (!selectedCustomer.value || isAnonymousCustomer.value) {
    resetWaroPreview()
    return
  }
  if (!waroRedemptionEnabled.value) return
  const lines = buildRedemptionPromoLines()
  if (!lines.length) {
    resetWaroPreview()
    return
  }
  schedulePreview({
    lines,
    customerId: selectedCustomer.value.id,
    manualDiscountAmount: discountAmount.value,
    discountType: discountEnabled.value ? discountType.value : null,
    discountValue:
      discountEnabled.value && discountInput.value
        ? Number(discountInput.value)
        : null,
    waroRewardId: selectedWaroReward.value?.id ?? null,
  })
}

const checkoutWaroBody = computed(() => {
  const body: Record<string, number | string> = {}
  if (selectedWaroReward.value?.id) body.waro_reward_id = selectedWaroReward.value.id
  return body
})

function setWaroRewardSelected(reward: WaroReward, selected: boolean) {
  if (warosBalance.value < reward.waros_cost) return
  if (selected) {
    selectedWaroReward.value = reward
  } else if (selectedWaroReward.value?.id === reward.id) {
    selectedWaroReward.value = null
  }
  refreshWaroPreview()
}

function waroRewardSubtitle(reward: WaroReward) {
  if (reward.reward_type === 'fixed_cop_off' && reward.fixed_cop_off) {
    return `${reward.waros_cost.toLocaleString('es-CO')} pts · ${formatCurrency(reward.fixed_cop_off)}`
  }
  return `${reward.waros_cost.toLocaleString('es-CO')} pts`
}

function clearWaroRedemption() {
  selectedWaroReward.value = null
  resetWaroPreview()
}

function isPaymentGroupVisible(group: PosPaymentGroup) {
  if (group.triggersCartera) {
    return !!(selectedCustomer.value && !isAnonymousCustomer.value)
  }
  // Wallet is a tender, not a discount. Only show it when the backend can debit
  // a real customer wallet and the cashier has a positive balance to apply.
  if (group.slug === WALLET_PAYMENT_SLUG || group.triggersWallet) {
    return !!(selectedCustomer.value && !isAnonymousCustomer.value && walletBalanceCop.value > 0)
  }
  return true
}

const isWalletMethod = computed(() => selectedGroup.value?.slug === WALLET_PAYMENT_SLUG)

const walletGroupAvailable = computed(() =>
  posPaymentGroups.value.some(group => group.slug === WALLET_PAYMENT_SLUG || group.triggersWallet)
)

watch(
  [
    () => selectedCustomer.value?.id,
    discountAmount,
    () => discountType.value,
    () => discountInput.value,
    () => selectedWaroReward.value?.id,
    cartItems,
    promoOptOutSignature,
    () => discountEnabled.value,
  ],
  () => refreshWaroPreview(),
  { deep: true },
)

watch(
  [
    () => selectedCustomer.value?.id,
    waroRedemptionEnabled,
  ],
  ([customerId, enabled]) => {
    if (!customerId || !enabled) return
    refreshWaroRewardsCatalog()
    refreshWaroPreview()
  },
  { immediate: true },
)

// Delivery eligibility — allowed for counter and bar (anything that's not a real mesa).
// Mesa is dine-in by definition; bar is a permanent counter tab used as walk-in/mostrador.
const canRegisterDelivery = computed(() => !isMesaMode.value)
const isDeliveryEligible = computed(() =>
  canRegisterDelivery.value &&
  acceptsOnlineOrders.value &&
  !!selectedCustomer.value &&
  !isAnonymousCustomer.value
)

// Sync address store with selected customer; reset delivery state when customer cleared
watch(() => selectedCustomer.value?.id, (customerId, prevId) => {
  if (customerId && customerId !== prevId) {
    addressStore.fetchAddresses(customerId)
  } else if (!customerId) {
    addressStore.reset()
    deliveryEnabled.value = false
    deliveryInstructions.value = ''
    showAddressForm.value = false
    addressFormError.value = null
  }
}, { immediate: true })

// Auto-disable delivery toggle when eligibility is lost (mesa mode, anon customer, gate flipped off)
watch(isDeliveryEligible, (eligible) => {
  if (!eligible) {
    deliveryEnabled.value = false
    showAddressForm.value = false
  }
})

const handleSaveAddress = async (payload: AddressCreate) => {
  if (!selectedCustomer.value?.id) return
  addressFormLoading.value = true
  addressFormError.value = null
  try {
    const created = await addressStore.createAddress(selectedCustomer.value.id, payload)
    if (created?.id) {
      addressStore.selectAddress(String(created.id))
    }
    showAddressForm.value = false
  } catch (err: any) {
    addressFormError.value =
      err?.data?.detail || err?.data?.message || err?.message || 'No se pudo guardar la dirección'
  } finally {
    addressFormLoading.value = false
  }
}

let estimateTimer: ReturnType<typeof setTimeout> | null = null

function refreshWarosEstimate() {
  if (!selectedCustomer.value || isAnonymousCustomer.value) return
  const total = discountedTotal.value
  if (total <= 0) return
  fetchEstimate(total, selectedCustomer.value.id, selectedPaymentMethod.value)
}

watch(discountedTotal, (total) => {
  if (!selectedCustomer.value || isAnonymousCustomer.value) return
  if (total <= 0) return
  if (estimateTimer) clearTimeout(estimateTimer)
  estimateTimer = setTimeout(refreshWarosEstimate, 400)
})

watch(selectedPaymentMethod, () => {
  if (!selectedCustomer.value || isAnonymousCustomer.value) return
  if (discountedTotal.value <= 0) return
  refreshWarosEstimate()
})

watch(selectedCustomer, async (customer) => {
  // Reset Waros state on customer change. Accordions stay where the user
  // last left them — never auto-open on customer change.
  resetSummary()
  resetEstimate()
  clearWaroRedemption()
  customerInsights.value = null
  insightsLoading.value = false
  if (!customer || customer.phone_number === '0000000000') return
  void refetchWallet()
  insightsLoading.value = true

  // Fetch insights + Waros in parallel so the right column doesn't fill in step by step.
  const insightsPromise = (async () => {
    try {
      const res = await $fetch<{ data: CustomerInsights }>(`/api/customers/${customer.id}/insights`)
      customerInsights.value = res.data
    } catch {
      customerInsights.value = null
    } finally {
      insightsLoading.value = false
    }
  })()

  const warosPromise = Promise.allSettled([
    fetchWarosSummary(customer.id),
    fetchEstimate(Math.max(cartTotal.value, 1), customer.id, selectedPaymentMethod.value),
  ])

  try {
    await Promise.allSettled([insightsPromise, warosPromise])
  } finally {
    if (insightsLoading.value) {
      insightsLoading.value = false
    }
  }
})

// Methods
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const getItemTotal = (item: any) => {
  const basePrice = Number(item.product.price) || 0
  const modifiersPrice = item.modifiers.reduce(
    (sum: number, mod: any) => sum + (Number(mod.price) || 0) * (Number(mod.quantity) || 1),
    0
  )
  return (basePrice + modifiersPrice) * (Number(item.quantity) || 1)
}

const getLinePromoLabel = (item: any) => {
  if (isLinePromoOptedOut(item)) return null
  if (item.promotionName) return item.promotionName
  if (item.orderItemId) {
    const preview = promoLineById.value.get(String(item.orderItemId))
    const previewName = preview?.promotion_name ?? preview?.promotionName ?? preview?.locked_promotion_name
    if (previewName) return previewName
  }
  if (item.id) {
    const preview = promoLineById.value.get(String(item.id))
    const previewName = preview?.promotion_name ?? preview?.promotionName ?? preview?.locked_promotion_name
    if (previewName) return previewName
  }
  return null
}

const getLinePromoTypeLabel = (item: any) => {
  const promoType = item.promoType
    ?? promoLineById.value.get(String(item.orderItemId ?? item.id ?? ''))?.promo_type
    ?? promoLineById.value.get(String(item.orderItemId ?? item.id ?? ''))?.promoType
    ?? promoLineById.value.get(String(item.orderItemId ?? item.id ?? ''))?.locked_promo_type
  return promoType ? formatPromoTypeLabel(promoType) : null
}

const getLinePromoPreview = (item: any): PromoPreviewLine | undefined => {
  const key = String(item.orderItemId ?? item.id ?? '')
  return key ? promoLineById.value.get(key) : undefined
}

const getLinePromoSavings = (item: any): number => {
  if (isLinePromoOptedOut(item)) return 0
  const preview = getLinePromoPreview(item)
  const fromApi = isKitchenServiceMode.value
    ? Number(item.promoSavings) || 0
    : Number(preview?.promo_savings ?? preview?.promoSavings ?? preview?.locked_promo_savings) || 0
  if (fromApi > 0) return fromApi
  const fromLine = Number(item.promoSavings) || 0
  if (fromLine > 0) return fromLine
  const productId = item.product?.id
  if (!productId || activePromos.value.length === 0) return 0
  return linePromoSavingsForProduct(
    activePromos.value,
    productId,
    {
      subtotal: checkoutLineGross(item),
      eligibleSubtotal: checkoutLineEligibleSubtotal(item),
      quantity: item.quantity,
    },
    checkoutLineCategoryId(item),
    promoPickOptions.value,
  )
}

const isLinePromoOptedOut = (item: any): boolean =>
  Boolean(item.promo_opt_out ?? item.promoOptOut)

const lineShowsPromoToggle = (item: any): boolean => {
  if (!allowPromoLineOptOut.value) return false
  if (isLinePromoOptedOut(item)) return true
  return getLinePromoSavings(item) > 0 || !!getLinePromoLabel(item)
}

const togglingPromoLineId = ref<string | null>(null)

const toggleLinePromoApply = async (item: any, apply: boolean) => {
  const lineId = String(item.orderItemId ?? item.id ?? '')
  if (!lineId || togglingPromoLineId.value) return

  togglingPromoLineId.value = lineId
  const promoOptOut = !apply
  try {
    if (isKitchenServiceMode.value) {
      const tableId = posStore.activeTableSession?.tableId
      if (!tableId) return
      await $fetch(`/api/tables/${tableId}/tab/items/${lineId}/promo-opt-out`, {
        method: 'PATCH',
        body: { promo_opt_out: promoOptOut },
      })
      posStore.setTabItems(
        storeTabItems.value.map(tabItem =>
          tabItem.orderItemId === lineId
            ? { ...tabItem, promoOptOut: promoOptOut }
            : tabItem,
        ),
      )
    } else {
      if (!posStore.cartId) return
      await $fetch(`/api/pos/cart/${posStore.cartId}/items/${lineId}/promo-opt-out`, {
        method: 'PATCH',
        body: { promo_opt_out: promoOptOut },
      })
      const cartItem = posStore.cart.find(cartLine => cartLine.id === lineId)
      if (cartItem) cartItem.promo_opt_out = promoOptOut
    }
    invalidateCheckoutPromoPreview()
  } catch (error: any) {
    toast.error(
      error?.data?.detail || error?.data?.message || 'No se pudo actualizar la promoción del ítem',
      { title: 'Error' },
    )
  } finally {
    togglingPromoLineId.value = null
  }
}

const getLineNetTotal = (item: any): number => {
  const gross = getItemTotal(item)
  const savings = getLinePromoSavings(item)
  if (savings <= 0) return gross
  if (!isKitchenServiceMode.value) {
    const afterPromo = getLinePromoPreview(item)?.subtotal_after_promo
    if (afterPromo != null) return Number(afterPromo)
  }
  return Math.max(0, gross - savings)
}

const getItemUnitPrice = (item: any) => {
  const qty = Number(item.quantity) || 1
  return getItemTotal(item) / qty
}

type PrintModifier = { id?: string; name: string; price?: number; quantity?: number }

const getModifierLineTotal = (mod: PrintModifier) =>
  (Number(mod.price) || 0) * (Number(mod.quantity) || 1)

const formatModifierPrintDesc = (mod: PrintModifier) => {
  const qty = Number(mod.quantity) || 1
  return qty > 1 ? `+ ${mod.name} ×${qty}` : `+ ${mod.name}`
}

function checkoutErrorMessage(error: any, fallback: string) {
  const detail = error?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item: any) => item?.msg ?? JSON.stringify(item)).join('; ')
  }
  return error?.data?.message || error?.message || fallback
}

const processOrder = async () => {
  // Mesa mode: close the table session as payment
  if (!selectedCustomer.value) {
    processingError.value = 'Selecciona o identifica al cliente antes de continuar'
    return
  }
  if (!manualDiscountIsValid.value) {
    processingError.value = discountValidationError.value
    return
  }

  if (isDeferredDeliveryPayment.value && posStore.activeTableSession?.isBar) {
    if (!addressStore.selectedAddressId) {
      processingError.value = 'Selecciona o crea una dirección de entrega'
      return
    }
    if (storeTabItems.value.length === 0) {
      processingError.value = 'Agrega los ítems a la cuenta y envíalos a cocina antes de dejarla pendiente'
      return
    }

    const session = posStore.activeTableSession
    try {
      isProcessing.value = true
      processingError.value = ''
      const response = await $fetch(`/api/tables/${session.tableId}/tab/defer-delivery-payment`, {
        method: 'POST',
        body: {
          customer_id: selectedCustomer.value.id,
          delivery_address_id: addressStore.selectedAddressId,
          ...(deliveryInstructions.value.trim()
            ? { delivery_instructions: deliveryInstructions.value.trim() }
            : {}),
        },
      }) as {
        success: boolean
        message: string
        data: {
          order_id: string
          order_number: number
          total_amount: number
          status: string
          payment_status?: string | null
          payment_method?: string | null
        }
      }

      if (response.success) {
        orderResult.value = {
          order_id: response.data.order_id,
          order_number: response.data.order_number,
          total_amount: response.data.total_amount,
          payment_method: response.data.payment_method ?? null,
          status: response.data.status,
          payment_status: response.data.payment_status ?? null,
          customer_id: selectedCustomer.value.id,
          standard_tax: taxPreview.value?.standard_tax ?? 0,
          liquor_tax: taxPreview.value?.liquor_tax ?? 0,
          standard_tax_label: taxPreview.value?.standard_tax_label ?? 'Impuesto',
        }
        wasMesaMode.value = false
        cartItemsSnapshot.value = [...cartItems.value]
        captureReceiptPrintContext()
        receiptEmail.value = ''
        emailSent.value = false
        emailFromProfile.value = false
        posStore.exitSession()
        cache.invalidateQueries({ key: ['tables', currentTenant.value?.id ?? null] })
        showSuccessModal.value = true
        document.body.classList.remove('printing-prefactura')
        prefacturaPrintSnapshot.value = null
      }
    } catch (error: any) {
      processingError.value = checkoutErrorMessage(error, 'Error al dejar la venta pendiente')
    } finally {
      isProcessing.value = false
    }
    return
  }

  if (isKitchenServiceMode.value) {
    const session = posStore.activeTableSession!
    if (session.isBar && storeTabItems.value.length === 0) {
      processingError.value = 'Agrega los ítems a la cuenta y envíalos a cocina antes de cobrar'
      return
    }
    try {
      isProcessing.value = true
      processingError.value = ''
      if (!(await ensureWalletTenderCanPay(finalAmountToCollect.value))) return
      const _discountAmt = discountAmount.value
      const _subtotal = cartTotal.value
      const _discountedTotal = discountedTotal.value
      const closeResponse = await $fetch(`/api/tables/${session.tableId}/close`, {
        method: 'POST',
        body: {
          payment_method: selectedPaymentMethod.value,
          customer_id: selectedCustomer.value?.id ?? null,
          payment_method_id: selectedPaymentMethodId.value ?? null,
          ...(selectedGroup.value?.triggersCartera && creditDueDate.value
            ? { credit_due_date: creditDueDate.value }
            : {}),
          ...(discountEnabled.value && _discountAmt > 0
            ? { discount_type: discountType.value, discount_value: Number(discountInput.value) }
            : {}),
          // Issue #524 — single-payment cash close: capture cash_received
          ...(isCashMethod.value
            ? { cash_received: Number(cashReceivedInput.value) }
            : {}),
          // warocol.com#639 — tip applied at mesa close (session-level, server stores
          // it on the first completed order of the session).
          ...checkoutTipBody.value,
          ...checkoutServedByBody.value,
          ...checkoutWaroBody.value,
        },
      }) as any

      // Immediately refresh floor plan availability (don't wait for modal close)
      cache.invalidateQueries({ key: ['tables', currentTenant.value?.id ?? null] })

      // Mesa close usually returns multiple orders; use the first order number (if provided)
      const closeData = closeResponse?.data ?? {}
      const closeMinimumConsumption = closeData.minimum_consumption ?? {}
      const closeAdvanceApplied = Number(closeData.advance_applied)
      const nestedAdvanceApplied = Number(closeMinimumConsumption.advance_applied ?? 0)
      const nestedAdvanceCover = Number(closeMinimumConsumption.cover_recognized ?? 0)
      const mesaAdvanceApplied = Number.isFinite(closeAdvanceApplied)
        ? closeAdvanceApplied
        : Math.min(
            prefacturaAmountDue.value,
            (nestedAdvanceApplied + nestedAdvanceCover) || checkoutSummaryAdvanceApplied.value,
          )
      const closeChargedAmount = Number(closeData.charged_amount)
      const mesaChargedAmount = closeData.charged_amount != null && Number.isFinite(closeChargedAmount)
        ? closeChargedAmount
        : Math.max(0, prefacturaAmountDue.value - mesaAdvanceApplied)
      const mesaOrderNumber =
        Number(closeData.order_number) ||
        Number(closeData.order_numbers?.[0]) ||
        0
      orderResult.value = {
        order_number: mesaOrderNumber,
        total_amount: _discountedTotal,
        payment_method: closeData.payment_method ?? selectedPaymentMethod.value,
        order_ids: closeData.order_ids || [],
        standard_tax: Number(closeData.standard_tax) || 0,
        liquor_tax: Number(closeData.liquor_tax) || 0,
        standard_tax_label: closeData.standard_tax_label || 'Impuesto',
        ...promoFieldsFromCloseResponse(closeData, _subtotal),
        ...(discountEnabled.value && _discountAmt > 0
          ? { discount_amount: _discountAmt, subtotal: _subtotal }
          : {}),
        // warocol.com#639 — surface tip in the success modal when the mesa close
        // returned a tip_amount (server-side validated against tenant.tip_enabled).
        ...(closeData.tip_amount && closeData.tip_amount > 0
          ? { tip_amount: closeData.tip_amount }
          : {}),
        ...(mesaAdvanceApplied > 0 || closeData.tip_amount > 0
          ? { advance_applied: mesaAdvanceApplied, charged_amount: mesaChargedAmount }
          : {}),
        ...waroOrderResultFields(closeData.waro_redemption_summary, _subtotal),
      }
      wasMesaMode.value = true
      cartItemsSnapshot.value = [...cartItems.value]
      captureReceiptPrintContext({
        singleCashReceived: isCashMethod.value && cashReceivedInput.value > 0
          ? Number(cashReceivedInput.value)
          : null,
        singleCashChange: isCashMethod.value ? cashChange.value : null,
      })
      const customerEmail = selectedCustomer.value?.email ?? ''
      receiptEmail.value = customerEmail && !customerEmail.endsWith('@customer.temp') ? customerEmail : ''
      emailSent.value = false
      posStore.clearAll()
      if (session.isBar) {
        posStore.exitSession()
      }
      showSuccessModal.value = true
      document.body.classList.remove('printing-prefactura')
      prefacturaPrintSnapshot.value = null
    } catch (error: any) {
      processingError.value = checkoutErrorMessage(error, `Error al cerrar la ${tableSingularLower.value}`)
    } finally {
      isProcessing.value = false
    }
    return
  }

  // Standard POS mode
  if (!selectedCustomer.value) {
    processingError.value = 'Selecciona o identifica al cliente antes de continuar'
    return
  }

  if (!posStore.cartId) {
    processingError.value = 'Error: El carrito no está sincronizado'
    return
  }

  if (deliveryEnabled.value && !addressStore.selectedAddressId) {
    processingError.value = 'Selecciona o crea una dirección de entrega'
    return
  }

  try {
    isProcessing.value = true
    processingError.value = ''
    if (!(await ensureWalletTenderCanPay(finalAmountToCollect.value))) return

    const preEmail = selectedCustomer.value?.email ?? ''
    const emailForReceipt = preEmail && !preEmail.endsWith('@customer.temp') ? preEmail : undefined

    const _discountAmtPos = discountAmount.value
    const _subtotalPos = cartTotal.value
    const response = await $fetch(`/api/pos/cart/${posStore.cartId}/complete`, {
      method: 'POST',
      body: {
        ...(isDeferredDeliveryPayment.value
          ? {}
          : {
              payment_method: selectedPaymentMethod.value,
              payment_method_id: selectedPaymentMethodId.value ?? null,
            }),
        customer_id: selectedCustomer.value.id,
        ...(selectedGroup.value?.triggersCartera && creditDueDate.value && !isDeferredDeliveryPayment.value
          ? { credit_due_date: creditDueDate.value }
          : {}),
        ...(discountEnabled.value && _discountAmtPos > 0
          ? { discount_type: discountType.value, discount_value: Number(discountInput.value) }
          : {}),
        ...(posStore.activeTableSession?.isBar
          ? { table_session_id: posStore.activeTableSession.sessionId }
          : {}),
        // Issue #524 — single-payment cash sale: capture cash_received on the order
        ...(isCashMethod.value && !isDeferredDeliveryPayment.value
          ? { cash_received: Number(cashReceivedInput.value) }
          : {}),
        ...(deliveryEnabled.value && addressStore.selectedAddressId
          ? {
              delivery_address_id: addressStore.selectedAddressId,
              ...(deliveryInstructions.value.trim()
                ? { delivery_instructions: deliveryInstructions.value.trim() }
                : {}),
            }
          : {}),
        ...checkoutServedByBody.value,
        // warocol.com#639 — tip capture (server validates against tenant.tip_enabled)
        ...checkoutTipBody.value,
        ...checkoutWaroBody.value,
      }
    }) as {
      success: boolean
      message: string
      data: {
        order_id: string
        order_number: number
        total_amount: number
        tip_amount?: number
        tip_source?: string
        charged_amount?: number
        payment_method?: string | null
        payment_status?: string | null
        status?: string
        items_count: number
        standard_tax?: number
        liquor_tax?: number
        standard_tax_label?: string
        next_table_session_id?: string | null
        subtotal?: number
        promo_savings?: number
        promo_breakdown?: PromoBreakdownLine[]
        waro_redemption_summary?: WaroRedemptionSummary
      }
    }

    if (response.success) {
      const subMethodName = selectedPaymentMethodId.value
        ? selectedGroup.value?.methods.find(m => m.id === selectedPaymentMethodId.value)?.name
        : undefined
      orderResult.value = {
        order_id: response.data.order_id,
        order_number: response.data.order_number,
        total_amount: response.data.total_amount,
        payment_method: response.data.payment_method,
        payment_method_name: subMethodName,
        status: response.data.status,
        payment_status: response.data.payment_status,
        customer_id: selectedCustomer.value?.id,
        standard_tax: response.data.standard_tax ?? 0,
        liquor_tax: response.data.liquor_tax ?? 0,
        standard_tax_label: response.data.standard_tax_label ?? 'Impuesto',
        ...promoFieldsFromCloseResponse(response.data, _subtotalPos),
        ...(discountEnabled.value && _discountAmtPos > 0
          ? { discount_amount: _discountAmtPos, subtotal: _subtotalPos }
          : {}),
        // warocol.com#639 — surface tip in the success modal when present
        ...(response.data.tip_amount && response.data.tip_amount > 0
          ? { tip_amount: response.data.tip_amount, charged_amount: response.data.charged_amount }
          : {}),
        ...waroOrderResultFields(
          response.data.waro_redemption_summary,
          Number(response.data.subtotal) || _subtotalPos,
        ),
      }
      cartItemsSnapshot.value = [...cartItems.value]
      captureReceiptPrintContext({
        singleCashReceived: isCashMethod.value && cashReceivedInput.value > 0
          ? Number(cashReceivedInput.value)
          : null,
        singleCashChange: isCashMethod.value ? cashChange.value : null,
      })
      receiptEmail.value = emailForReceipt ?? ''
      emailSent.value = false
      emailFromProfile.value = !!emailForReceipt
      posStore.clearAll()
      // After a bar POS sale, drop the local session so /pos shows the floor
      // plan again (clearAll keeps bar sessions alive on purpose; here we
      // explicitly exit because the backend already rotated to a new session
      // and the next entry must come through the floor plan).
      if (posStore.activeTableSession?.isBar) {
        posStore.exitSession()
      }
      showSuccessModal.value = true
      document.body.classList.remove('printing-prefactura')
      prefacturaPrintSnapshot.value = null
    }
  } catch (error: any) {
    processingError.value = checkoutErrorMessage(error, 'Error processing order')
  } finally {
    isProcessing.value = false
  }
}

const onCustomerIdentified = async (customer: { id: string; name: string | null; phone_number: string | null; email: string | null }) => {
  posDebugLog('checkout', 'onCustomerIdentified:start', {
    customerId: customer.id,
    phone: customer.phone_number,
    ...checkoutDebugSnapshot(),
  })
  selectedCustomer.value = customer
  processingError.value = ''
  // Bar / mesa tab / synced counter cart: do not load the new customer's empty backend cart (#1101).
  const preserveCart =
    !!posStore.activeTableSession?.isBar
    || isKitchenServiceMode.value
    || (!!posStore.cartId && posStore.cart.length > 0)
  posDebugLog('checkout', 'onCustomerIdentified:preserveCart', { preserveCart })
  try {
    await posStore.setCustomer(customer as any, { preserveCart })
    posDebugLog('checkout', 'onCustomerIdentified:done', checkoutDebugSnapshot())
  } catch (error) {
    posDebugLog('checkout', 'onCustomerIdentified:failed', posDebugSerializeError(error))
    throw error
  }
}

// Derived from dynamic groups
const selectedGroup = computed(() =>
  posPaymentGroups.value.find(g => g.slug === selectedPaymentMethod.value) ?? null
)
const canDeferDeliveryPayment = computed(() =>
  isDeliveryEligible.value
)
const isDeferredDeliveryPayment = computed(() =>
  deliveryEnabled.value && !isMesaMode.value && !selectedPaymentMethod.value
)
const deferDeliveryPayment = () => {
  if (!selectedCustomer.value || isAnonymousCustomer.value) {
    processingError.value = 'Identifica un cliente real para registrar domicilio'
    return
  }
  deliveryEnabled.value = true
  selectedPaymentMethod.value = ''
}

// Reset sub-method and search when group changes
watch(selectedPaymentMethod, () => {
  selectedPaymentMethodId.value = null
  methodSearch.value = ''
})
watch(deliveryEnabled, (enabled) => {
  if (!enabled && !selectedPaymentMethod.value) {
    selectedPaymentMethod.value = 'cash'
  }
})

// ── Issue #524 — Cash tender + change calculation ────────────────────────────
// Active only when the selected payment group is "cash". Cashier types how
// much cash the customer handed over and the system shows the change live.
// In split mode the input applies to splitAmountToCharge; in single payment
// it applies to discountedTotal. Backend persists cash_received on
// order_payments (split lines) or orders (single payment).
const isCashMethod = computed(() => selectedGroup.value?.slug === 'cash')
const cashReceivedInput = ref<number>(0)
const mesaMinimumConsumption = computed(() =>
  mesaCurrentData.value?.data?.session?.minimum_consumption
  ?? posStore.activeTableSession?.minimumConsumption
  ?? null
)
const mesaAdvanceAvailable = computed(() =>
  Number(mesaMinimumConsumption.value?.advance_total ?? mesaMinimumConsumption.value?.advance ?? 0) || 0
)
const mesaAdvanceAppliedEstimate = computed(() => {
  if (!isKitchenServiceMode.value || splitMode.value) return 0
  return Math.min(finalChargedAmount.value, mesaAdvanceAvailable.value)
})
const finalAmountToCollect = computed(() =>
  Math.max(0, finalChargedAmount.value - mesaAdvanceAppliedEstimate.value)
)

const walletChargeAmount = computed(() =>
  splitMode.value ? splitAmountToCharge.value : finalAmountToCollect.value
)

const walletUnavailableMessage = computed(() => {
  if (!walletGroupAvailable.value) return ''
  if (!selectedCustomer.value) return 'Identifica un cliente para usar saldo wallet.'
  if (isAnonymousCustomer.value) return 'La wallet requiere un cliente identificado.'
  if (isWalletPending.value) return 'Consultando saldo wallet...'
  if (walletBalanceCop.value <= 0) return 'Este cliente no tiene saldo wallet disponible.'
  return ''
})

const walletTenderValidationMessage = computed(() => {
  if (!isWalletMethod.value) return ''
  if (walletUnavailableMessage.value) return walletUnavailableMessage.value
  if (walletChargeAmount.value > walletBalanceCop.value) {
    return `Saldo wallet insuficiente: disponible ${formatCurrency(walletBalanceCop.value)}.`
  }
  return ''
})

async function ensureWalletTenderCanPay(amount: number) {
  if (!isWalletMethod.value) return true
  if (!selectedCustomer.value || isAnonymousCustomer.value) {
    processingError.value = 'Identifica un cliente real para pagar con wallet'
    return false
  }
  try {
    await refetchWallet()
  } catch {
    // The backend remains authoritative; use the last cached balance if refresh fails.
  }
  if (walletBalanceCop.value <= 0) {
    processingError.value = 'Este cliente no tiene saldo wallet disponible'
    return false
  }
  if (amount > walletBalanceCop.value) {
    processingError.value = `Saldo wallet insuficiente: disponible ${formatCurrency(walletBalanceCop.value)}`
    return false
  }
  return true
}

// warocol.com#639 — single-payment cash flow must cover total + tip (#737: split too).
const cashAmountToCharge = computed(() =>
  splitMode.value ? splitAmountToCharge.value : finalAmountToCollect.value
)

const cashChange = computed(() =>
  Math.max(0, (cashReceivedInput.value || 0) - cashAmountToCharge.value)
)
const cashShortfall = computed(() =>
  Math.max(0, cashAmountToCharge.value - (cashReceivedInput.value || 0))
)
const cashIsValid = computed(() =>
  !isCashMethod.value || cashAmountToCharge.value <= 0.01 || (cashReceivedInput.value > 0 && cashShortfall.value <= 0.01)
)

// Issue #524 — input starts at 0 and stays at 0 until the cashier either
// taps a preset or types. Auto-prefilling with the amount made it look like
// "Sin vuelto" was already chosen, which was confusing. Reset to 0 only when
// the method group changes (so switching methods clears the previous tender).
watch(
  isCashMethod,
  () => {
    cashReceivedInput.value = 0
  },
)

// Issue #524 — thousand-separator formatting lives in CheckoutCashTenderPanel.

const filteredMethods = computed(() => {
  const methods = selectedGroup.value?.methods ?? []
  const q = methodSearch.value.trim().toLowerCase()
  if (!q) return methods
  return methods.filter(m => m.name.toLowerCase().includes(q))
})

const getPaymentMethodLabel = (method: string) => {
  if (method === 'table_session_advance') return 'Anticipo mesa'
  return posPaymentGroups.value.find(g => g.slug === method)?.name ?? method
}

// True when the selected group has sub-methods but none is chosen yet
const requiresMethodSelection = computed(() =>
  (selectedGroup.value?.methods?.length ?? 0) > 0 && !selectedPaymentMethodId.value
)

// Dynamic grid class based on group count (excluding hidden cartera groups)
const paymentGridClass = computed(() => {
  const visibleCount = posPaymentGroups.value.filter(g => isPaymentGroupVisible(g)).length
  if (visibleCount <= 2) return 'grid-cols-2'
  if (visibleCount === 3) return 'grid-cols-3'
  return 'grid-cols-2 md:grid-cols-4'
})

const cancelOrder = async () => {
  if (splitPayments.value.length > 0) {
    if (!window.confirm('Ya hay pagos parciales registrados. ¿Seguro que quieres cancelar?')) return
  }
  if (posStore.activeTableSession?.isBar) {
    // Bar session — clear local cart but keep session alive (it's permanent)
    posStore.clearCart()
    sessionStorage.setItem('posNavigation', 'true')
    router.push('/pos')
  } else {
    sessionStorage.setItem('posNavigation', 'true')
    router.push('/pos')
  }
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  emailFromProfile.value = false
  invoiceResult.value = null
  invoiceError.value = ''
  invoiceQrDataUrl.value = ''
  invoiceResults.value = []
  invoiceProgress.value = ''
  fiscalWizardOpen.value = false
  fiscalWizardError.value = ''
  // Reset delivery state after successful order
  deliveryEnabled.value = false
  deliveryInstructions.value = ''
  showAddressForm.value = false
  addressFormError.value = null
  addressStore.reset()
  if (wasMesaMode.value) {
    cache.invalidateQueries({ key: ['tables', currentTenant.value?.id ?? null] })
    router.push('/pos')
  } else {
    router.push('/pos')
  }
}

async function buildInvoiceQrDataUrl(cufe: string): Promise<string> {
  const dianUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`
  return QRCode.toDataURL(dianUrl, { width: 150, margin: 1 })
}

const generateInvoice = async () => {
  if (invoiceLoading.value) return
  if (isCreditOnlyInvoiceBlocked.value) {
    invoiceError.value = 'Las ventas con pago solo crédito no emiten factura electrónica desde este flujo.'
    return
  }

  // Determine which order_ids to invoice
  const ids: string[] = []
  if (orderResult.value?.order_id) ids.push(orderResult.value.order_id)
  else if (orderResult.value?.order_ids?.length) ids.push(...orderResult.value.order_ids)
  if (ids.length === 0) return

  invoiceLoading.value = true
  invoiceError.value = ''
  invoiceResults.value = []
  invoiceProgress.value = ''

  try {
    for (let i = 0; i < ids.length; i++) {
      if (ids.length > 1) invoiceProgress.value = `Facturando orden ${i + 1} de ${ids.length}...`
      try {
        const result = await $fetch(`/api/orders/${ids[i]}/invoice`, { method: 'POST' }) as any
        if (result.status === 'accepted') {
          invoiceResults.value.push({
            order_id: ids[i],
            prefix: result.prefix,
            invoice_number: result.invoice_number,
            cufe: result.cufe || '',
            status: result.status,
          })
        } else {
          invoiceResults.value.push({
            order_id: ids[i],
            prefix: result.prefix,
            invoice_number: result.invoice_number,
            cufe: '',
            status: 'error',
            error: result.error_message || `Rechazada: ${result.prefix}-${result.invoice_number}`,
          })
        }
        // For single order, set the legacy invoiceResult for QR/print
        if (ids.length === 1 && result.status === 'accepted') {
          invoiceResult.value = {
            cufe: result.cufe || '',
            invoice_number: result.invoice_number,
            prefix: result.prefix,
            pdf_presigned_url: result.pdf_presigned_url || null,
            status: result.status,
          }
          if (result.cufe) {
            invoiceQrDataUrl.value = await buildInvoiceQrDataUrl(result.cufe)
          }
        } else if (ids.length === 1 && result.status !== 'accepted') {
          invoiceError.value = result.error_message || `Factura rechazada: ${result.prefix}-${result.invoice_number}`
        }
      } catch (e: any) {
        const errMsg = extractInvoiceFetchError(e)
        invoiceResults.value.push({
          order_id: ids[i],
          prefix: '',
          invoice_number: 0,
          cufe: '',
          status: 'error',
          error: errMsg,
        })
        if (ids.length === 1) {
          invoiceError.value = errMsg
        }
      }
    }
    // For multi-order, set invoiceResult from first successful for QR
    if (ids.length > 1) {
      const first = invoiceResults.value.find(r => r.status !== 'error')
      if (first) {
        invoiceResult.value = { cufe: first.cufe, invoice_number: first.invoice_number, prefix: first.prefix, pdf_presigned_url: null, status: first.status }
        if (first.cufe) {
          invoiceQrDataUrl.value = await buildInvoiceQrDataUrl(first.cufe)
        }
      }
      const failed = invoiceResults.value.filter(r => r.status === 'error').length
      if (failed > 0) {
        invoiceError.value = `${failed} de ${ids.length} facturas falló. Reintenta para las pendientes.`
      }
    }
    invoiceProgress.value = ''
  } catch (e: any) {
    invoiceError.value = extractInvoiceFetchError(e)
  } finally {
    invoiceLoading.value = false
    invoiceProgress.value = ''
  }
}

const printReceipt = async () => {
  // Ensure post-payment receipt wins over a prior prefactura print (#939).
  document.body.classList.remove('printing-prefactura')
  if (invoiceResult.value?.cufe && !invoiceQrDataUrl.value) {
    invoiceQrDataUrl.value = await buildInvoiceQrDataUrl(invoiceResult.value.cufe)
  }
  await nextTick()
  window.print()
}

// Issue #535 — tenant fiscal data for the prefactura header.
// Read from the POS restaurant-context aggregator (settingsData above) so
// the cashier doesn't need MI_NEGOCIO. The /facturacion owner panel reads
// /api/api/tenant/fiscal-data directly with its richer write surface.
const fiscalData = computed(() => settingsData.value?.data?.fiscal_data ?? null)

const receiptPrintSettings = computed(() =>
  settingsData.value?.data?.receipt_print_settings ?? { document_label: 'Prefactura', tip_label: 'Propina', show_logo: true },
)

const receiptTipLabel = computed(() => {
  const label = (receiptPrintSettings.value.tip_label || 'Propina').trim()
  return label || 'Propina'
})

const receiptLogoUrl = computed(() => {
  if (!receiptPrintSettings.value.show_logo) return null
  const url = settingsData.value?.data?.logo_url ?? businessProfile.value?.logo_url ?? null
  return url && String(url).startsWith('http') ? url : null
})

// warocol.com#939 — pre-bill always reads as prefactura; post-payment uses receiptDocumentLabel.
const prefacturaDocumentLabel = computed(() => {
  const label = (receiptPrintSettings.value.document_label || '').trim()
  if (!label || /factura/i.test(label) || /prefactura|pre-cuenta|pre cuenta|precuenta/i.test(label)) {
    return 'Prefactura'
  }
  return label
})

const receiptDocumentLabel = computed(() => {
  const label = (receiptPrintSettings.value.document_label || '').trim()
  // Prefactura-like labels first — /factura/i matches the "factura" substring in "Prefactura" (#942).
  if (!label || /prefactura|pre-cuenta|pre cuenta|precuenta|pre-factura|pre factura/i.test(label)) return 'Factura'
  if (/factura/i.test(label)) return label
  return label
})

const prefacturaTaxTotal = computed(() => {
  if (!taxPreview.value) return 0
  return (taxPreview.value.standard_tax || 0) + (taxPreview.value.liquor_tax || 0)
})

// Mesa runningTotal already includes session taxes; counter cartTotal is pre-tax.
const prefacturaOrderTotal = computed(() => {
  if (isKitchenServiceMode.value) return discountedTotal.value
  return discountedTotal.value + prefacturaTaxTotal.value
})

const prefacturaAmountDue = computed(() =>
  prefacturaOrderTotal.value + tipSettlementTotal(tipAmount.value, tipTaxAmount.value),
)

/** Resumen de la Orden — order total incl. taxes; amount due adds tip settlement (#737). */
const checkoutSummaryOrderTotal = computed(() => prefacturaOrderTotal.value)
const checkoutSummaryAdvanceApplied = computed(() =>
  Math.min(prefacturaAmountDue.value, mesaAdvanceAppliedEstimate.value)
)
const checkoutSummaryAmountDue = computed(() =>
  Math.max(0, prefacturaAmountDue.value - checkoutSummaryAdvanceApplied.value)
)

type PrefacturaPrintSnapshot = {
  orderTotal: number
  tipAmount: number
  tipTaxAmount: number
  tipTaxLabel: string
  advanceApplied: number
  amountDue: number
  splitPayments: ReceiptPaymentLine[]
  splitRemaining: number
  splitIsComplete: boolean
  promoSavings: number
  promoBreakdown: PromoBreakdownLine[]
  cartSubtotal: number
  manualDiscountAmount: number
  waroDiscountCop: number
  waroRewardName: string | null
}

const prefacturaPrintSnapshot = ref<PrefacturaPrintSnapshot | null>(null)

const prefacturaPrintData = computed(() => {
  if (prefacturaPrintSnapshot.value) return prefacturaPrintSnapshot.value
  const postCheckoutWaro = showSuccessModal.value && (Number(orderResult.value?.waro_discount_cop) || 0) > 0
  return {
    orderTotal: prefacturaOrderTotal.value,
    tipAmount: tipAmount.value,
    tipTaxAmount: tipTaxAmount.value,
    tipTaxLabel: tipTaxLabel.value,
    advanceApplied: checkoutSummaryAdvanceApplied.value,
    amountDue: checkoutSummaryAmountDue.value,
    splitPayments: splitPayments.value,
    splitRemaining: splitRemaining.value,
    splitIsComplete: splitIsComplete.value,
    promoSavings: promoSavings.value,
    promoBreakdown: displayPromoBreakdown.value,
    cartSubtotal: cartTotal.value,
    manualDiscountAmount: discountAmount.value,
    waroDiscountCop: postCheckoutWaro
      ? Number(orderResult.value!.waro_discount_cop)
      : waroDiscountCop.value,
    waroRewardName: postCheckoutWaro
      ? (orderResult.value!.waro_reward_name ?? null)
      : waroRewardLabel.value,
  }
})

const orderResultWaroDiscountCop = computed(() => Number(orderResult.value?.waro_discount_cop) || 0)
const orderResultWaroLineLabel = computed(() => {
  const name = orderResult.value?.waro_reward_name
  return name ? `WaRo: ${name}` : 'Canje WaRo'
})
const orderResultChargedAmount = computed(() => {
  const result = orderResult.value
  if (!result) return 0
  const backendAmount = Number(result.charged_amount)
  if (result.charged_amount != null && Number.isFinite(backendAmount)) return backendAmount
  return Math.max(
    0,
    (Number(result.total_amount) || 0)
      + (Number(result.tip_amount) || 0)
      - (Number(result.advance_applied) || 0),
  )
})
const isCreditOnlyInvoiceBlocked = computed(() =>
  orderResult.value?.payment_method === 'credit'
  && splitPaymentsSnapshot.value.length === 0
)

const receiptPromoBreakdown = computed(() => {
  const breakdown = orderResult.value?.promo_breakdown ?? []
  if (breakdown.length > 0) return breakdown
  const savings = Number(orderResult.value?.promo_savings) || 0
  if (savings <= 0) return []
  return [{ promotion_name: 'Promoción', promo_type: '', savings }]
})

function capturePrefacturaPrintSnapshot() {
  prefacturaPrintSnapshot.value = {
    orderTotal: prefacturaOrderTotal.value,
    tipAmount: tipAmount.value,
    tipTaxAmount: tipTaxAmount.value,
    tipTaxLabel: tipTaxLabel.value,
    advanceApplied: checkoutSummaryAdvanceApplied.value,
    amountDue: checkoutSummaryAmountDue.value,
    splitPayments: splitPayments.value.map(p => ({ ...p })),
    splitRemaining: splitRemaining.value,
    splitIsComplete: splitIsComplete.value,
    promoSavings: promoSavings.value,
    promoBreakdown: displayPromoBreakdown.value.map(p => ({ ...p })),
    cartSubtotal: cartTotal.value,
    manualDiscountAmount: discountAmount.value,
    waroDiscountCop: waroDiscountCop.value,
    waroRewardName: waroRewardLabel.value,
  }
}

const prefacturaDocNumber = computed(() => {
  if (isKitchenServiceMode.value) {
    const orders = mesaCurrentData.value?.data?.orders as Array<{ order_number?: number }> | undefined
    if (orders?.length) {
      const maxNum = Math.max(...orders.map(o => Number(o.order_number) || 0))
      if (maxNum > 0) return String(maxNum)
    }
    const sessionId = mesaCurrentData.value?.data?.session?.id ?? posStore.activeTableSession?.sessionId
    if (sessionId) return sessionId.replace(/-/g, '').slice(-5).toUpperCase()
    return null
  }
  const cartId = posStore.cartId
  if (cartId) return cartId.replace(/-/g, '').slice(-5).toUpperCase()
  return null
})

const prefacturaTableCode = computed(() => {
  const name = posStore.activeTableSession?.tableName
  if (!name) return null
  return displayTableCode({ name })
})

const prefacturaWaiterName = computed(() => {
  const memberId = posStore.cartServedByMemberId
    ?? mesaCurrentData.value?.data?.session?.effective_waiter_member_id
    ?? posStore.activeTableSession?.effectiveWaiterMemberId
  if (memberId) {
    const member = tenantMembers.value.find((m: { id: string }) => m.id === memberId)
    if (member?.name) return member.name
  }
  return posStore.activeTableSession?.effectiveWaiterMemberName
    ?? mesaCurrentData.value?.data?.session?.effective_waiter_member_name
    ?? null
})

function captureReceiptPrintContext(opts?: { singleCashReceived?: number | null; singleCashChange?: number | null }) {
  const session = posStore.activeTableSession
  const customer = selectedCustomer.value
  const tableName = session?.tableName ?? null
  receiptPrintContext.value = {
    soldAt: formatTenantDateTime(),
    wasMesa: wasMesaMode.value || isMesaMode.value,
    isBar: session?.isBar ?? false,
    tableName,
    tableCode: tableName ? displayTableCode({ name: tableName }) : null,
    waiterName: prefacturaWaiterName.value,
    customerName: customer && customer.phone_number !== '0000000000'
      ? (customer.fiscal_business_name || customer.name || customer.phone_number)
      : null,
    customerFiscalIdType: customer?.fiscal_id_type ?? null,
    customerFiscalId: customer?.fiscal_id ?? null,
    customerFiscalBusinessName: customer?.fiscal_business_name ?? null,
    singlePaymentCashReceived: opts?.singleCashReceived ?? null,
    singlePaymentChange: opts?.singleCashChange ?? null,
    advanceApplied: checkoutSummaryAdvanceApplied.value,
  }
  splitPaymentsSnapshot.value = splitPayments.value.map(p => ({ ...p }))
}

// Issue #535 — print pre-bill (prefactura) before payment.
// Toggles a body class so @media print rules switch which printable div is
// exposed (#pos-prefactura instead of the default #pos-receipt). The post-
// payment receipt path is undisturbed.
const prefacturaDateTime = computed(() =>
  formatTenantDateTime()
)
// Prefactura is purely visual — never block on tax preview state. If taxes
// haven't loaded (or the tenant has no taxes configured), the prefactura
// just omits those lines. The prefactura footer disclaimer makes the document
// non-fiscal, so printing without taxes is acceptable.
const prefacturaDisabled = computed(() => false)
const printPrefactura = async () => {
  capturePrefacturaPrintSnapshot()
  document.body.classList.add('printing-prefactura')

  const cleanup = () => {
    document.body.classList.remove('printing-prefactura')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  // Defensive fallback for browsers where afterprint may not fire on cancel.
  setTimeout(cleanup, 2000)

  await nextTick()
  window.print()
}

// Re-emit after a recoverable failure (e.g. Matias 401) — skips fiscal wizard.
const retryInvoice = async () => {
  if (invoiceLoading.value) return
  invoiceError.value = ''
  await generateInvoice()
}

// Entry point for "Generar factura electrónica DIAN" — shows the inline
// wizard when the customer has no fiscal data, otherwise emits directly.
const requestInvoice = async () => {
  if (invoiceLoading.value) return
  if (isCreditOnlyInvoiceBlocked.value) {
    invoiceError.value = 'Las ventas con pago solo crédito no emiten factura electrónica desde este flujo.'
    return
  }
  if (selectedCustomer.value && !selectedCustomer.value.fiscal_id && !isAnonymousCustomer.value) {
    fiscalWizardError.value = ''
    fiscalWizardForm.value = {
      fiscal_id_type: '',
      fiscal_id: '',
      fiscal_business_name: selectedCustomer.value.name || '',
    }
    fiscalWizardOpen.value = true
    return
  }
  await generateInvoiceAndPrint()
}

// Wizard submit: persist fiscal data on the customer profile, then emit.
const submitFiscalAndInvoice = async () => {
  if (!fiscalWizardCanSubmit.value || !selectedCustomer.value) return
  fiscalWizardSaving.value = true
  fiscalWizardError.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: PosCustomer }>(
      `/api/customers/${selectedCustomer.value.id}`,
      {
        method: 'PATCH',
        body: {
          fiscal_id_type: fiscalWizardForm.value.fiscal_id_type || null,
          fiscal_id: fiscalWizardForm.value.fiscal_id.trim() || null,
          fiscal_business_name: fiscalWizardForm.value.fiscal_business_name.trim() || null,
        },
      },
    )
    if (res.success) {
      selectedCustomer.value = { ...selectedCustomer.value, ...res.data }
      fiscalWizardOpen.value = false
      await generateInvoiceAndPrint()
    }
  } catch (e: any) {
    fiscalWizardError.value = e.data?.detail || e.data?.message || e.message || 'Error al guardar los datos'
  } finally {
    fiscalWizardSaving.value = false
  }
}

// Emit the invoice without auto-printing.
// Printing is always manual via "Imprimir comprobante".
const generateInvoiceAndPrint = async () => {
  await generateInvoice()
}

const sendReceiptEmail = async () => {
  if (!receiptEmail.value || !orderResult.value || isSendingEmail.value) return
  isSendingEmail.value = true
  try {
    // Map frontend cart items to include computed subtotal for the email template
    const itemsForEmail = cartItemsSnapshot.value.map((item: any) => ({
      ...item,
      subtotal: getItemTotal(item),
    }))
    await $fetch(`/api/pos/cart/receipt-email`, {
      method: 'POST',
      body: {
        email: receiptEmail.value,
        order_number: orderResult.value.order_number,
        total_amount: orderResult.value.total_amount,
        payment_method: orderResult.value.payment_method,
        items: itemsForEmail,
        business_name: businessProfile.value?.display_name ?? null,
        business_address: businessProfile.value?.address ?? null,
        business_city: businessProfile.value?.city ?? null,
        business_phone: businessProfile.value?.phone_number ?? null,
        discount_amount: orderResult.value.discount_amount ?? 0,
        subtotal: orderResult.value.subtotal ?? 0,
        standard_tax: orderResult.value.standard_tax ?? 0,
        liquor_tax: orderResult.value.liquor_tax ?? 0,
        standard_tax_label: orderResult.value.standard_tax_label ?? 'Impuesto',
        promo_savings: orderResult.value.promo_savings ?? 0,
        promo_breakdown: orderResult.value.promo_breakdown ?? [],
        waro_redemption_summary: orderResult.value.waro_redemption_summary ?? null,
        invoice_prefix: invoiceResult.value?.prefix ?? null,
        invoice_number: invoiceResult.value?.invoice_number ?? null,
        invoice_cufe: invoiceResult.value?.cufe ?? null,
        tip_amount: orderResult.value.tip_amount ?? 0,
      }
    })
    emailSent.value = true
  } catch (e: any) {
    // Surface the failure so the cashier knows the email did NOT go out (#134).
    // Most common case: 422 from EmailStr validation when the address is empty
    // or malformed. detail can be either an array (Pydantic) or a string.
    const detail = e?.data?.detail
    const message =
      Array.isArray(detail)
        ? detail[0]?.msg ?? 'No se pudo enviar el correo.'
        : typeof detail === 'string'
          ? detail
          : 'No se pudo enviar el correo. Verifica la dirección.'
    toast.error(message, { title: 'Error al enviar recibo' })
  } finally {
    isSendingEmail.value = false
  }
}

// Payment methods now hydrate from the `paymentMethodsData` useQuery defined
// at the top of the script (cache shared with /ventas/ordenes). The legacy
// fetchPaymentMethods() function was removed in the parallel-loading refactor.
const isLoadingPaymentMethods = computed(() =>
  paymentMethodsAsyncStatus.value === 'loading' && !paymentMethodsData.value
)

// Sincronizar carrito al backend cuando carga la página
const syncCart = async () => {
  // Si no hay items, no hacer nada
  if (posStore.cart.length === 0) {
    posDebugLog('checkout', 'syncCart:skipped-empty', {
      isBar: !!posStore.activeTableSession?.isBar,
      tabItems: storeTabItems.value.length,
    })
    isSyncingCart.value = false
    return
  }

  try {
    isSyncingCart.value = true
    syncError.value = ''
    posDebugLog('checkout', 'syncCart:start', { cartId: posStore.cartId, items: posStore.cart.length })

    const success = await posStore.syncCartBatch()
    if (!success) {
      syncError.value = 'Error al sincronizar el carrito'
      posDebugLog('checkout', 'syncCart:batch-failed', { cartId: posStore.cartId })
    } else {
      posDebugLog('checkout', 'syncCart:ok', { cartId: posStore.cartId })
    }
  } catch (error: any) {
    syncError.value = error.message || 'Error al sincronizar'
    posDebugLog('checkout', 'syncCart:failed', posDebugSerializeError(error))
  } finally {
    isSyncingCart.value = false
  }
}

// ── Initial-load + optimistic-refresh wiring (mirrors /ventas/ordenes).
// isLoading: page is mounting and the relevant backend read is in-flight for
// the first time. Renders a full-page CommonsTheCustomLoader in the template.
// isRefreshing: a refetch is in-flight while we already have data. Surfaced
// in the layout header via registerProgressiveLoading — content stays visible.
const isLoading = computed(() => {
  if (
    posStore.activeTableSession?.isBar
    && settingsAsyncStatus.value === 'loading'
    && !settingsData.value
    && !hasOrderLines.value
  ) {
    return true
  }
  if (isKitchenServiceMode.value) {
    return !mesaCurrentData.value && !mesaCurrentError.value && mesaCurrentAsyncStatus.value === 'loading'
  }
  // Counter/bar: session cart sync on mount is the only full-page gate (#1030).
  // Do not block checkout when the cashier identifies a real customer.
  return false
})
const isRefreshing = computed(() => {
  if (isKitchenServiceMode.value) {
    return mesaCurrentAsyncStatus.value === 'loading' && mesaCurrentData.value != null
  }
  return false
})
const checkoutError = computed(() => (isKitchenServiceMode.value ? mesaCurrentError.value : null))

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const refreshAll = async () => {
  await Promise.all([
    cache.invalidateQueries({ key: ['pos', 'payment-methods'] }),
    isKitchenServiceMode.value
      ? cache.invalidateQueries({ key: ['tables', posStore.activeTableSession?.tableId ?? null, 'current'] })
      : cache.invalidateQueries({ key: ['pos', 'cart', posStore.cartId ?? null, 'tax-preview'] }),
    showCheckoutComandas.value
      ? cache.invalidateQueries({ key: ['tables', posStore.activeTableSession?.tableId ?? null, posStore.activeTableSession?.sessionId ?? null, 'comandas'] })
      : Promise.resolve(),
  ])
}
registerProgressiveLoading(isRefreshing, 'Actualizando pagos')

// Issue warocol.com#656 — rehydrate splitPayments from the active query.
// The same source of truth feeds both the initial render and any refetch
// (after a mutation or manual refresh). Replaces the previous one-shot
// onMounted block that used a separate $fetch and ignored future refreshes.
const hydratePartialsFrom = (partials: any[] | undefined) => {
  if (!partials || partials.length === 0) return
  splitPayments.value = partials.map((p: any) => ({
    id: p.id,
    amount: Number(p.amount),
    payment_method: p.payment_method,
    payment_method_id: p.payment_method_id ?? null,
    payment_method_name: p.payment_method_name ?? getPaymentMethodLabel(p.payment_method),
  }))
  splitPaidTotal.value = splitPayments.value.reduce((acc, p) => acc + p.amount, 0)
  if (!splitMode.value) splitMode.value = true
}
const resetSplitPayments = () => {
  splitPayments.value = []
  splitPaidTotal.value = 0
  splitMode.value = false
}
watch(() => mesaCurrentData.value?.data?.session?.partial_payments, hydratePartialsFrom)
watch(() => selectedCustomer.value?.id, () => {
  resetSplitPayments()
})

// Sync cart on mount. payment-methods, mesa /current and pos cart queries are
// already in flight (declared above as useQuery, in parallel with the mount).
onMounted(async () => {
  posDebugLog('checkout', 'mount', {
    route: useRoute().path,
    debugEnabled: true,
    ...checkoutDebugSnapshot(),
  })

  // Siempre regeneramos el carrito backend desde el estado local actual.
  if (posStore.cart.length > 0) {
    isSyncingCart.value = true
  }

  setRefreshHandler(refreshAll)

  // Cart sync is the only operation that's genuinely sequential (mutation
  // local → backend). All read queries already kicked off from setup.
  await syncCart()
  posDebugLog('checkout', 'mount:after-syncCart', checkoutDebugSnapshot())
})

watch(
  () => cartItems.value.length,
  (count, prev) => {
    if (count === 0 && (prev ?? 0) > 0) {
      posDebugLog('checkout', 'cartItems:became-empty', {
        selectedCustomerId: selectedCustomer.value?.id ?? null,
        ...checkoutDebugSnapshot(),
      })
    }
  },
)

watch(showEmptyCheckout, (empty, wasEmpty) => {
  if (empty && !wasEmpty) {
    posDebugLog('checkout', 'ui:empty-cart-shown', checkoutDebugSnapshot())
  }
})

watch(
  () => [isKitchenServiceMode.value, comandasEnabled.value, storeTabItems.value.length] as const,
  ([kitchen, comandas, tabCount], prev) => {
    if (!prev) return
    const [prevKitchen, prevComandas, prevTabCount] = prev
    if (kitchen === prevKitchen && comandas === prevComandas && tabCount === prevTabCount) return
    posDebugLog('checkout', 'mode:changed', {
      from: { kitchen: prevKitchen, comandas: prevComandas, tabCount: prevTabCount },
      to: { kitchen, comandas, tabCount },
      ...checkoutDebugSnapshot(),
    })
  },
)

onUnmounted(() => {
  clearRefreshHandler(refreshAll)
})

// Issue #529 — auto-select Genérico when the tenant flag is on. Applies to
// counter, bar, AND mesa modes: the customer is only attached to orders at
// close time anyway, so pre-selecting Genérico is safe and uniform across
// modes. Uses a watcher (not onMounted) because businessProfile is loaded
// asynchronously by the tenants store and may still be undefined when
// checkout mounts on a fresh page load.
watch(
  () => posStore.currentCustomer,
  (customer) => {
    if (!customer || selectedCustomer.value) return
    selectedCustomer.value = {
      id: customer.id,
      name: customer.name ?? null,
      phone_number: customer.phone_number ?? null,
      email: customer.email ?? null,
    }
  },
  { immediate: true },
)

const autoSelectAttempted = ref(false)
watch(
  () => businessProfile.value,
  async (profile) => {
    if (autoSelectAttempted.value) return
    if (!profile) return                                  // not loaded yet — wait
    if (!profile.auto_select_generic_enabled) return      // tenant opted out
    if (selectedCustomer.value) return                    // already chosen — don't override
    autoSelectAttempted.value = true
    try {
      const res = await $fetch<{ success: boolean; data: PosCustomer }>(
        '/api/customers/search-or-create',
        {
          method: 'POST',
          body: { phone_number: '0000000000', name: 'Cliente sin datos' },
        },
      )
      if (res.success) selectedCustomer.value = res.data
    } catch {
      // Silent fallback: cashier still has the modal button (no UX regression).
    }
  },
  { immediate: true },
)

// Clear pending timers on unmount
onUnmounted(() => {
  if (estimateTimer) clearTimeout(estimateTimer)
})
</script>

<template>
  <div class="w-full pb-32 lg:pb-0">
    <!-- Loading State: initial cart sync OR first-read queries in-flight.
         Optimistic refetches (after mutations) keep content visible and surface
         in the layout header via registerProgressiveLoading instead. -->
    <div v-if="isSyncingCart || isLoading" class="flex items-center justify-center min-h-[70vh]">
      <div class="text-center">
        <CommonsTheCustomLoader size="large" />
        <p class="text-text-secondary font-medium mt-6">
          {{ isSyncingCart ? 'Preparando checkout...' : 'Cargando checkout...' }}
        </p>
      </div>
    </div>

    <!-- Error State (cart sync OR initial read failure) -->
    <CommonsTheErrorState v-else-if="syncError || checkoutError" />

    <!-- Empty Cart State -->
    <div v-else-if="showEmptyCheckout" class="text-center py-16">
      <svg class="h-24 w-24 mx-auto text-text-secondary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
      <h2 class="text-xl font-semibold text-text-primary mb-2">Carrito Vacío</h2>
      <p class="text-text-secondary mb-6">No hay productos en tu orden</p>
      <UiButton variant="default" @click="sessionStorage.setItem('posNavigation', 'true'); router.push('/pos')">
        Volver al POS
      </UiButton>
    </div>

    <!-- Main Grid (cart has items and sync completed) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- Live promotion hint — checkout header (warocol.com#983) -->
      <div
        v-if="hasActivePromos"
        role="status"
        class="lg:col-span-12 flex items-center gap-3 min-h-[44px] px-4 py-3 bg-status-success-bg border border-status-success-text/25 rounded-xl"
      >
        <div class="flex-shrink-0 bg-status-success-text/15 p-1.5 rounded-lg">
          <svg class="w-4 h-4 text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <p class="text-sm text-status-success-text font-medium">
          Promo activa: {{ activePromoHint }}
        </p>
      </div>

      <!-- LEFT COLUMN: Order Items & Payment Method -->
      <div class="lg:col-span-8 space-y-6">

        <!-- ACCORDION: Orden -->
        <div class="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
          <button
            type="button"
            @click="activeAccordion = activeAccordion === 'order' ? null : 'order'"
            class="w-full px-4 py-3 flex justify-between items-center bg-surface-secondary/50 text-left hover:bg-surface-secondary/70 transition-colors"
          >
            <span class="font-bold text-text-primary flex items-center gap-2 text-sm md:text-base">
                <svg class="h-4 w-4 md:h-5 md:w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              Orden
              <span class="text-text-tertiary font-normal text-xs ml-1">({{ cartItems.length }})</span>
            </span>
            <svg
              class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'order' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>

          <div v-show="activeAccordion === 'order'" class="divide-y divide-border border-t border-border">
            <!-- Cart Items -->
            <div
              v-for="(item, index) in cartItems"
              :key="index"
              class="px-3 py-2.5 md:p-4 flex gap-2.5 md:gap-4 items-start group hover:bg-surface-secondary/50 theme-transition"
            >
              <!-- Order Number -->
              <div class="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-action-primary-bg text-action-primary-text flex items-center justify-center text-xs font-bold mt-0.5">
                {{ index + 1 }}
              </div>

              <!-- Product Image -->
              <div class="w-10 h-10 md:w-16 md:h-16 rounded-lg bg-surface-secondary flex items-center justify-center text-xl md:text-3xl flex-shrink-0 border border-border">
                {{ item.product.image }}
              </div>

              <!-- Product Info -->
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <h3 class="font-semibold text-text-primary text-sm leading-tight truncate">{{ item.product.name }}</h3>
                    <span
                      v-if="getLinePromoLabel(item)"
                      class="text-[10px] bg-state-success-bg text-state-success-text  px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                      :title="getLinePromoTypeLabel(item) || undefined"
                    >
                      {{ getLinePromoLabel(item) }}
                    </span>
                    <span
                      v-if="getLinePromoSavings(item) > 0"
                      class="text-[10px] text-state-success-text  font-medium flex-shrink-0"
                    >
                      - {{ formatCurrency(getLinePromoSavings(item)) }}
                    </span>
                    <span v-if="item.quantity > 1" class="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                      ×{{ item.quantity }}
                    </span>
                  </div>
                  <div class="flex flex-col items-end flex-shrink-0">
                    <span
                      v-if="getLinePromoSavings(item) > 0"
                      class="text-xs text-text-tertiary line-through"
                    >
                      {{ formatCurrency(getItemTotal(item)) }}
                    </span>
                    <span class="font-bold text-text-primary text-sm">{{ formatCurrency(getLineNetTotal(item)) }}</span>
                  </div>
                </div>

                <p class="text-xs text-text-tertiary mt-0.5">{{ formatCurrency(item.product.price) }} c/u</p>

                <!-- Modifiers -->
                <div v-if="item.modifiers && item.modifiers.length > 0" class="mt-0.5 space-y-0">
                  <p v-for="mod in item.modifiers" :key="mod.id" class="text-text-tertiary text-xs">
                    + {{ mod.name }}<template v-if="(mod.quantity ?? 1) > 1"> ×{{ mod.quantity ?? 1 }}</template> · {{ formatCurrency((Number(mod.price) || 0) * (Number(mod.quantity) || 1)) }}
                  </p>
                </div>

                <!-- Notes -->
                <p v-if="item.notes" class="text-xs text-text-tertiary italic mt-0.5">{{ item.notes }}</p>

                <label
                  v-if="lineShowsPromoToggle(item)"
                  class="mt-2 flex items-center justify-between gap-3 min-h-[44px] rounded-lg border border-border bg-surface-secondary/40 px-3 py-2 cursor-pointer"
                  :class="togglingPromoLineId === String(item.orderItemId ?? item.id ?? '') ? 'opacity-60 pointer-events-none' : ''"
                >
                  <span class="text-xs font-medium text-text-primary">Aplicar promoción</span>
                  <span class="relative inline-flex items-center flex-shrink-0">
                    <input
                      type="checkbox"
                      class="sr-only peer"
                      :checked="!isLinePromoOptedOut(item)"
                      :disabled="togglingPromoLineId === String(item.orderItemId ?? item.id ?? '')"
                      @change="toggleLinePromoApply(item, ($event.target as HTMLInputElement).checked)"
                    />
                    <span class="block w-10 h-6 bg-control-toggle-track-off rounded-full peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Customer Identification -->
        <div class="bg-surface rounded-2xl shadow-sm border border-border p-4 md:p-6">
          <h2 class="font-bold text-text-primary flex items-center gap-2 mb-3 text-sm md:text-base">
            <svg class="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Datos del Cliente
          </h2>

          <!-- Customer selected: show card -->
          <div v-if="selectedCustomer" class="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
              {{ selectedCustomer.name?.charAt(0)?.toUpperCase() || selectedCustomer.phone_number?.charAt(0) || '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-text-primary truncate">{{ selectedCustomer.name || 'Cliente sin datos' }}</p>
              <p class="text-sm text-text-secondary truncate">{{ selectedCustomer.phone_number || 'Sin teléfono' }}</p>
              <p v-if="selectedCustomer.fiscal_id" class="text-xs text-state-success-text  truncate mt-0.5 flex items-center gap-1">
                <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                Factura: {{ selectedCustomer.fiscal_id_type }} {{ selectedCustomer.fiscal_id }}
              </p>
              <div
                v-if="!isAnonymousCustomer"
                class="flex flex-wrap gap-2 mt-2"
                aria-live="polite"
              >
                <div
                  v-if="isWalletPending"
                  class="h-5 w-[6.5rem] rounded-full bg-surface-secondary animate-pulse"
                  aria-label="Cargando saldo wallet"
                />
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-state-success-bg text-state-success-text border border-state-success-border"
                >
                  Wallet: {{ formatCurrency(walletBalanceCop) }}
                </span>
              </div>
            </div>
            <button
              @click="showCustomerModal = true"
              class="min-h-[44px] px-3 py-2 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
            >
              Cambiar
            </button>
          </div>

          <!-- No customer yet: open modal button -->
          <button
            v-else
            @click="showCustomerModal = true"
            class="w-full min-h-[56px] flex items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <span class="font-medium">Buscar o identificar cliente</span>
          </button>
        </div>

        <!-- Section: Payment Method -->
        <div class="bg-surface rounded-2xl shadow-sm border border-border p-4 md:p-6">
          <h2 class="font-bold text-text-primary flex items-center gap-2 mb-3 text-sm md:text-base">
            <svg class="h-4 w-4 md:h-5 md:w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
            Método de Pago
          </h2>

          <!-- Skeleton while loading payment methods -->
          <div v-if="isLoadingPaymentMethods" class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div
              v-for="i in 4"
              :key="i"
              class="rounded-xl border border-border p-2.5 md:p-4 h-[72px] md:h-[88px] flex flex-col items-center md:items-start gap-2 animate-pulse"
            >
              <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-border flex-shrink-0" />
              <div class="h-3 w-14 rounded bg-border" />
            </div>
          </div>

          <!-- Dynamic payment method groups — loaded from API, falls back to 4 defaults -->
          <div v-if="!isLoadingPaymentMethods" class="grid gap-2 md:gap-4 overflow-x-auto pb-1" :class="paymentGridClass">
            <button
              v-if="canDeferDeliveryPayment"
              type="button"
              @click="deferDeliveryPayment"
              class="cursor-pointer relative border rounded-xl p-2.5 md:p-4 theme-transition h-full min-w-[112px] flex flex-col items-center gap-1.5 md:gap-3 md:items-start active:scale-[0.99]"
              :class="isDeferredDeliveryPayment
                ? 'border-status-warning-text/50 bg-status-warning-bg shadow-sm text-status-warning-text'
                : 'border-border text-text-secondary hover:border-status-warning-text/40 hover:text-text-primary'"
            >
              <div class="flex items-center justify-between w-full">
                <div class="bg-status-warning-bg text-status-warning-text w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l3 2.25m6-2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <svg
                  class="h-4 w-4 transition-all hidden md:block text-status-warning-text"
                  :class="isDeferredDeliveryPayment ? 'opacity-100' : 'opacity-0'"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div class="text-center md:text-left w-full">
                <div class="font-semibold text-xs md:text-sm leading-tight">
                  Al entregar
                </div>
              </div>
              <div
                v-if="isDeferredDeliveryPayment"
                class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full md:hidden bg-status-warning-text"
              ></div>
            </button>
            <label
              v-for="group in posPaymentGroups"
              :key="group.slug"
              v-show="isPaymentGroupVisible(group)"
              class="cursor-pointer relative min-w-[112px]"
            >
              <input type="radio" name="payment" :value="group.slug" v-model="selectedPaymentMethod" class="sr-only">
              <div
                class="border rounded-xl p-2.5 md:p-4 theme-transition h-full flex flex-col items-center gap-1.5 md:gap-3 md:items-start"
                :class="selectedPaymentMethod === group.slug
                  ? (group.triggersCartera ? 'border-state-warning-border bg-state-warning-bg shadow-sm ' : 'border-primary bg-primary/5 shadow-sm')
                  : (group.triggersCartera ? 'border-border hover:border-state-warning-border/40' : 'border-border hover:border-primary/30')"
              >
                <div class="flex items-center justify-between w-full">
                  <!-- Icon — cash -->
                  <div
                    v-if="group.slug === 'cash'"
                    class="bg-state-success-bg text-state-success-text w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                    </svg>
                  </div>
                  <!-- Icon — card -->
                  <div
                    v-else-if="group.slug === 'card'"
                    class="bg-state-info-bg text-state-info-text w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                  </div>
                  <!-- Icon — digital -->
                  <div
                    v-else-if="group.slug === 'digital'"
                    class="bg-state-info-bg text-state-info-icon w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                    </svg>
                  </div>
                  <!-- Icon — wallet anticipo -->
                  <div
                    v-else-if="group.slug === WALLET_PAYMENT_SLUG || group.triggersWallet"
                    class="bg-state-success-bg text-state-success-text w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                    </svg>
                  </div>
                  <!-- Icon — credit / triggersCartera -->
                  <div
                    v-else-if="group.triggersCartera"
                    class="bg-state-warning-bg text-state-warning-text w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <!-- Icon — custom group fallback -->
                  <div
                    v-else
                    class="bg-primary/10 text-primary w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                  </div>

                  <!-- Checkmark -->
                  <svg
                    class="h-4 w-4 transition-all hidden md:block"
                    :class="[
                      selectedPaymentMethod === group.slug ? 'opacity-100' : 'opacity-0',
                      group.triggersCartera ? 'text-state-warning-text' : 'text-primary'
                    ]"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>

                <!-- Group name -->
                <div class="text-center md:text-left w-full">
                  <div
                    class="font-semibold text-xs md:text-sm leading-tight"
                    :class="selectedPaymentMethod === group.slug && group.triggersCartera ? 'text-state-warning-text' : 'text-text-primary'"
                  >
                    {{ group.name }}
                  </div>
                </div>

                <!-- Mobile selected dot -->
                <div
                  v-if="selectedPaymentMethod === group.slug"
                  class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full md:hidden"
                  :class="group.triggersCartera ? 'bg-action-warning-bg' : 'bg-primary'"
                ></div>
              </div>
            </label>
          </div>

          <p
            v-if="walletUnavailableMessage && !isWalletMethod"
            class="mt-3 text-xs font-medium text-text-secondary"
          >
            {{ walletUnavailableMessage }}
          </p>
          <p
            v-else-if="walletTenderValidationMessage"
            class="mt-3 text-xs font-semibold text-state-danger-text"
          >
            {{ walletTenderValidationMessage }}
          </p>

          <!-- Sub-method selector — shown when selected group has subtypes (e.g. Nequi, Daviplata) -->
          <div v-if="selectedGroup?.methods?.length" class="mt-3">
            <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" :class="requiresMethodSelection ? 'text-destructive' : 'text-text-secondary'">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              ¿Con cuál método de {{ selectedGroup.name }}?
            </p>

            <!-- Search — only when > 10 methods -->
            <div v-if="selectedGroup.methods.length > 10" class="relative mb-2">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="methodSearch"
                type="text"
                placeholder="Buscar método..."
                class="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <!-- Grid mode — up to 6 methods -->
            <div
              v-if="selectedGroup.methods.length <= 6"
              class="grid gap-2 overflow-x-auto pb-1"
              :class="selectedGroup.methods.length <= 2
                ? 'grid-cols-2'
                : selectedGroup.methods.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3'"
            >
              <button
                v-for="method in selectedGroup.methods"
                :key="method.id"
                type="button"
                @click="selectedPaymentMethodId = selectedPaymentMethodId === method.id ? null : method.id"
                class="relative min-h-[48px] min-w-[112px] px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all text-center active:scale-95"
                :class="selectedPaymentMethodId === method.id
                  ? (selectedGroup.triggersCartera
                      ? 'border-state-warning-border bg-state-warning-bg text-state-warning-text shadow-sm'
                      : 'border-primary bg-primary/10 text-primary shadow-sm')
                  : 'border-border bg-background text-text-secondary hover:border-primary/30 hover:text-text-primary'"
              >
                {{ method.name }}
                <span
                  v-if="selectedPaymentMethodId === method.id"
                  class="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                  :class="selectedGroup.triggersCartera ? 'bg-action-warning-bg' : 'bg-primary'"
                />
              </button>
            </div>

            <!-- List mode — more than 6 methods (scrollable) -->
            <div
              v-else
              class="rounded-xl border border-border bg-background overflow-x-auto"
            >
              <div class="max-h-[220px] min-w-full overflow-y-auto divide-y divide-border">
                <button
                  v-for="method in filteredMethods"
                  :key="method.id"
                  type="button"
                  @click="selectedPaymentMethodId = selectedPaymentMethodId === method.id ? null : method.id"
                  class="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors active:scale-[0.99]"
                  :class="selectedPaymentMethodId === method.id
                    ? (selectedGroup.triggersCartera
                        ? 'bg-state-warning-bg text-state-warning-text font-semibold'
                        : 'bg-primary/8 text-primary font-semibold')
                    : 'text-text-primary hover:bg-surface-secondary/50'"
                >
                  <span class="min-w-0 truncate pr-3">{{ method.name }}</span>
                  <svg
                    v-if="selectedPaymentMethodId === method.id"
                    class="w-4 h-4 flex-shrink-0"
                    :class="selectedGroup.triggersCartera ? 'text-state-warning-text' : 'text-primary'"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <div v-if="filteredMethods.length === 0" class="px-4 py-3 text-sm text-text-secondary text-center">
                  Sin resultados para "{{ methodSearch }}"
                </div>
              </div>
            </div>
          </div>

          <!-- Credit due date (optional) — shown only when a triggersCartera group is selected -->
          <div v-if="selectedGroup?.triggersCartera && selectedCustomer && !isAnonymousCustomer" class="mt-3 p-3 bg-state-warning-bg  border border-state-warning-border  rounded-xl">
            <label class="block text-xs font-semibold text-state-warning-text  mb-1.5">
              Fecha límite de pago <span class="font-normal text-state-warning-text">(opcional)</span>
            </label>
            <input
              v-model="creditDueDate"
              type="date"
              class="w-full h-9 px-3 rounded-lg border border-state-warning-border  bg-white  text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-state-warning-border"
            />
          </div>
        </div>

        <!-- Section: Descuento -->
        <div class="bg-surface rounded-2xl shadow-sm border border-border p-4 md:p-6">
          <!-- Header with toggle -->
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-text-primary flex items-center gap-2 text-sm md:text-base">
              <svg class="h-4 w-4 md:h-5 md:w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              Descuento
            </h2>
            <button
              type="button"
              role="switch"
              :aria-checked="discountEnabled"
              @click="toggleManualDiscount"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              :class="discountEnabled ? 'bg-primary' : 'bg-border'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 rounded-full bg-control-toggle-thumb shadow transform ring-0 transition duration-200"
                :class="discountEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Discount inputs — revealed when enabled -->
          <div v-if="discountEnabled" class="mt-4 space-y-3">
            <!-- Type pill toggle -->
            <div class="flex rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                @click="selectDiscountType('percent')"
                class="flex-1 min-h-[44px] text-sm font-semibold transition-colors"
                :class="discountType === 'percent' ? 'bg-primary/10 text-primary' : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/70'"
              >
                %
              </button>
              <button
                type="button"
                @click="selectDiscountType('fixed')"
                class="flex-1 min-h-[44px] text-sm font-semibold transition-colors border-l border-border"
                :class="discountType === 'fixed' ? 'bg-primary/10 text-primary' : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/70'"
              >
                $ Fijo
              </button>
            </div>

            <!-- Value input -->
            <div class="relative">
              <input
                v-model="discountInput"
                type="number"
                :min="0.01"
                :max="discountType === 'percent' ? 100 : Math.round(subtotalAfterPromos)"
                :step="discountType === 'percent' ? 0.01 : 1"
                :placeholder="discountType === 'percent' ? 'Ej: 10 (10%)' : 'Ej: 5000'"
                :aria-invalid="discountValidationError ? 'true' : 'false'"
                :class="discountValidationError ? 'border-state-danger-border focus:ring-state-danger-border' : 'border-border focus:ring-primary'"
                class="w-full min-h-[44px] px-4 py-2.5 rounded-xl border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2"
              />
            </div>

            <div class="flex items-start justify-between gap-3">
              <p
                v-if="discountValidationError"
                class="text-xs font-medium text-state-danger-text"
              >
                {{ discountValidationError }}
              </p>
              <p
                v-else
                class="text-xs text-text-tertiary"
              >
                Base disponible: {{ formatCurrency(subtotalAfterPromos) }}
              </p>
              <button
                v-if="discountInput"
                type="button"
                @click="clearManualDiscount"
                class="text-xs font-semibold text-text-secondary hover:text-primary"
              >
                Limpiar
              </button>
            </div>

            <!-- Live preview -->
            <div v-if="discountAmount > 0" class="flex items-center justify-between px-4 py-2.5 bg-primary/10 rounded-lg">
              <span class="text-sm font-medium text-primary">Descuento aplicado</span>
              <span class="text-sm font-bold text-primary">-{{ formatCurrency(discountAmount) }}</span>
            </div>
          </div>
        </div>

        <!-- warocol.com#663 + #735 — Waiter first, then tip (opt-in; no tenant preselect on POS). -->
        <CheckoutWaiterSelector
          v-if="showCheckoutWaiterSelector"
          :members="tenantMembers"
          :model-value="posStore.cartServedByMemberId"
          @update:model-value="posStore.setCartServedBy"
        />

        <!-- warocol.com#735 — Tip block only when a mesero is selected (split mode hides via computed). -->
        <CheckoutTipSelector
          v-if="showCheckoutTipSelector"
          :enabled="tipEnabled"
          :presets="tipPresets"
          :preselect-index="null"
          :subtotal="cartTotal"
          v-model="tipModel"
        />
        <div
          v-if="showCheckoutTipSelector && tipAmount > 0"
          class="rounded-xl border border-border bg-surface px-4 py-3 flex flex-col gap-2"
        >
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              v-model="tipTaxable"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-action-primary-focus-ring/30"
              aria-label="Propina gravada con impuesto al consumo"
            />
            <span class="text-sm text-text-primary leading-snug">
              Propina gravada
              <span class="block text-xs text-text-secondary mt-0.5">
                Incluye {{ tipTaxLabel.toLowerCase() }} según la configuración fiscal del negocio.
              </span>
            </span>
          </label>
          <p v-if="tipTaxable && tipTaxAmount > 0" class="text-xs text-text-secondary tabular-nums pl-7">
            {{ tipTaxLabel }}: {{ formatCurrency(tipTaxAmount) }}
          </p>
        </div>

        <!-- Section: Domicilio (mostrador or bar — never mesa) -->
        <div v-if="canRegisterDelivery" class="bg-surface rounded-2xl shadow-sm border border-border p-4 md:p-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-bold text-text-primary flex items-center gap-2 text-sm md:text-base">
              <svg class="h-4 w-4 md:h-5 md:w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                <path d="M15 18H9" />
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                <circle cx="17" cy="18" r="2" />
                <circle cx="7" cy="18" r="2" />
              </svg>
              Domicilio
            </h2>
            <label
              class="relative inline-flex items-center"
              :class="isDeliveryEligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
            >
              <input
                v-model="deliveryEnabled"
                type="checkbox"
                class="sr-only peer"
                :disabled="!isDeliveryEligible"
                aria-label="Activar domicilio para esta orden"
              />
              <div class="w-11 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <!-- Helper messages — explain why the toggle is disabled -->
          <p v-if="!acceptsOnlineOrders" class="text-xs text-text-secondary mt-2">
            Activa "Pedidos en línea" en /negocio para habilitar domicilios.
          </p>
          <p v-else-if="!selectedCustomer" class="text-xs text-text-secondary mt-2">
            Selecciona un cliente para habilitar domicilio.
          </p>
          <p v-else-if="isAnonymousCustomer" class="text-xs text-text-secondary mt-2">
            Identifica al cliente (no anónimo) para habilitar domicilio.
          </p>

          <!-- Expanded delivery details — only when toggle is on -->
          <Transition name="fade" mode="out-in">
            <div v-if="deliveryEnabled && selectedCustomer" class="mt-4 space-y-4">
              <!-- Address picker / form switch -->
              <DeliveryAddressForm
                v-if="showAddressForm"
                :customer-id="selectedCustomer.id"
                :loading="addressFormLoading"
                :error="addressFormError"
                @submit="handleSaveAddress"
                @cancel="showAddressForm = false"
              />
              <DeliveryAddressPicker
                v-else
                :addresses="addressStore.addresses"
                :selected-id="addressStore.selectedAddressId"
                :loading="addressStore.isLoading"
                @update:selected-id="addressStore.selectAddress"
                @add-new="showAddressForm = true"
              />

              <!-- Delivery instructions (order-level) -->
              <div class="flex flex-col gap-1">
                <label for="pos-delivery-instructions" class="text-sm font-medium text-text-primary">
                  Notas para el repartidor (opcional)
                </label>
                <textarea
                  id="pos-delivery-instructions"
                  v-model="deliveryInstructions"
                  rows="3"
                  maxlength="500"
                  placeholder="Ej: tocar el timbre, llegar por la entrada lateral…"
                  class="input-base w-full px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
          </Transition>
        </div>

        <!-- Customer Search Modal -->
        <PosCustomerIdentificationModal
          v-model="showCustomerModal"
          @customer-identified="onCustomerIdentified"
          @fiscal-updated="onCustomerIdentified"
        />

      </div>

      <!-- RIGHT COLUMN: Accordion (Desktop Only) -->
      <div class="hidden lg:block lg:col-span-4 lg:sticky lg:top-8 space-y-3">

        <!-- ACCORDION 1: Customer Insights (loading or has history) -->
        <div
          v-if="insightsLoading || (customerInsights && customerInsights.orders_count > 0)"
          class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
        >
          <!-- Trigger -->
          <button
            @click="activeAccordion = activeAccordion === 'insights' ? null : 'insights'"
            class="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-surface-secondary/40 transition-colors"
          >
            <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 select-none">
              {{ selectedCustomer?.name?.charAt(0)?.toUpperCase() || selectedCustomer?.phone_number?.charAt(0) || '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-text-primary text-sm leading-tight truncate">
                {{ selectedCustomer?.name || 'Cliente' }}
              </p>
              <p class="text-xs text-text-secondary leading-tight mt-0.5">{{ selectedCustomer?.phone_number }}</p>
            </div>
            <svg
              class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'insights' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>

          <!-- Body -->
          <div v-show="activeAccordion === 'insights'" class="border-t border-border">
            <!-- Skeleton while loading -->
            <div v-if="insightsLoading" class="p-4 grid grid-cols-2 gap-2.5">
              <div
                v-for="i in 4" :key="i"
                class="bg-surface-secondary rounded-xl p-4 flex flex-col gap-2 animate-pulse"
              >
                <div class="h-4 w-4 rounded bg-surface"></div>
                <div class="h-5 w-16 rounded bg-surface mt-1"></div>
                <div class="h-3 w-12 rounded bg-surface"></div>
              </div>
            </div>
            <!-- Actual insights -->
            <PosCustomerInsightsCard v-else-if="customerInsights" :insights="customerInsights" />
          </div>
        </div>

        <!-- ACCORDION 2: Resumen de la Orden -->
        <div class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          <!-- Trigger -->
          <button
            @click="activeAccordion = activeAccordion === 'summary' ? null : 'summary'"
            class="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-secondary/40 transition-colors"
          >
            <h3 class="font-bold text-text-primary">Resumen de la Orden</h3>
            <svg
              class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'summary' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>

          <!-- Body -->
          <div v-show="activeAccordion === 'summary'" class="border-t border-border px-5 py-4">
            <div class="space-y-3 mb-4">
              <div class="flex justify-between text-sm text-text-secondary">
                <span>Subtotal ({{ cartItems.length }} productos)</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(cartTotal) }}</span>
              </div>
              <div v-if="promoSavings > 0" class="flex justify-between text-sm text-state-success-text ">
                <span>Promoción</span>
                <span class="font-medium">- {{ formatCurrency(promoSavings) }}</span>
              </div>
              <div
                v-for="(promo, promoIdx) in displayPromoBreakdown"
                v-show="displayPromoBreakdown.length > 1"
                :key="promo.promotion_id ?? promo.promotion_name ?? promoIdx"
                class="flex justify-between text-xs text-state-success-text/90  pl-3"
              >
                <span>{{ promo.promotion_name }}</span>
                <span class="font-medium">- {{ formatCurrency(promo.savings) }}</span>
              </div>
              <div
                v-if="promoSavings > 0"
                class="flex justify-between text-sm text-text-secondary"
              >
                <span>Subtotal con promoción</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(subtotalAfterPromos) }}</span>
              </div>
              <div v-if="discountEnabled && discountAmount > 0" class="flex justify-between text-sm text-primary">
                <span>Descuento manual</span>
                <span class="font-medium">- {{ formatCurrency(discountAmount) }}</span>
              </div>
              <div v-if="waroDiscountCop > 0" class="flex justify-between text-sm text-state-warning-text">
                <span>{{ waroRewardLabel ? `WaRo: ${waroRewardLabel}` : 'Canje WaRo' }}</span>
                <span class="font-medium">- {{ formatCurrency(waroDiscountCop) }}</span>
              </div>
              <div class="flex justify-between text-sm text-text-secondary">
                <span>{{ taxPreview ? taxPreview.standard_tax_label : 'Impuestos (0%)' }}</span>
                <span class="font-medium text-text-primary">
                  {{ formatCurrency(taxPreview ? (taxPreview.standard_tax + taxPreview.liquor_tax) : 0) }}
                </span>
              </div>
              <div
                v-if="tipAmount > 0"
                class="flex justify-between text-sm text-text-secondary"
              >
                <span>{{ receiptTipLabel }}</span>
                <span class="font-medium text-text-primary tabular-nums">{{ formatCurrency(tipAmount) }}</span>
              </div>
              <div
                v-if="tipAmount > 0 && tipTaxAmount > 0"
                class="flex justify-between text-sm text-text-secondary"
              >
                <span>{{ tipTaxLabel }}</span>
                <span class="font-medium text-text-primary tabular-nums">{{ formatCurrency(tipTaxAmount) }}</span>
              </div>
            </div>

            <div class="border-t border-dashed border-border pt-4">
              <div
                v-if="tipAmount > 0 || checkoutSummaryAdvanceApplied > 0"
                class="flex justify-between text-sm text-text-secondary mb-2"
              >
                <span>Total orden</span>
                <span class="font-medium text-text-primary tabular-nums">{{ formatCurrency(checkoutSummaryOrderTotal) }}</span>
              </div>
              <div
                v-if="checkoutSummaryAdvanceApplied > 0"
                class="flex justify-between text-sm text-state-success-text mb-2"
              >
                <span>Anticipo mesa</span>
                <span class="font-medium tabular-nums">- {{ formatCurrency(checkoutSummaryAdvanceApplied) }}</span>
              </div>
              <div class="flex justify-between items-end mb-1">
                <span class="text-text-secondary font-medium">Total a Pagar</span>
                <span class="text-3xl font-bold text-primary tabular-nums">{{ formatCurrency(checkoutSummaryAmountDue) }}</span>
              </div>
              <p class="text-right text-xs text-text-tertiary">COP</p>
            </div>
          </div>
        </div>

        <!-- ACCORDION: Comandas -->
        <div
          v-if="showCheckoutComandas"
          class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
        >
          <button
            type="button"
            @click="activeAccordion = activeAccordion === 'comandas' ? null : 'comandas'"
            class="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-surface-secondary/40 transition-colors"
          >
            <span class="font-bold text-text-primary flex items-center gap-2">
              <svg class="h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3.75h10.5A2.25 2.25 0 0 1 19.5 6v14.25l-2.625-1.5-2.625 1.5-2.625-1.5-2.625 1.5-2.625-1.5-2.625 1.5V6a2.25 2.25 0 0 1 2.25-2.25Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 8.25h7.5M8.25 12h7.5M8.25 15.75h4.5" />
              </svg>
              Comandas
            </span>
            <span class="ml-auto text-xs font-semibold text-text-secondary">
              {{ selectedComandaCount }}/{{ sentComandasForCheckout.length }}
            </span>
            <svg
              class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'comandas' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>

          <div v-show="activeAccordion === 'comandas'" class="border-t border-border px-5 py-4 space-y-3">
            <div v-if="checkoutComandasLoading" class="space-y-2">
              <div v-for="i in 2" :key="i" class="h-14 rounded-lg bg-surface-secondary animate-pulse" />
            </div>
            <div
              v-else-if="sentComandasForCheckout.length === 0"
              class="rounded-lg border border-border bg-surface-secondary/50 px-3 py-3 text-sm text-text-secondary"
            >
              No hay comandas enviadas para esta sesión.
            </div>
            <div v-else class="space-y-1.5">
              <label
                v-for="comanda in sentComandasForCheckout"
                :key="comanda.id"
                class="flex items-start gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 cursor-pointer hover:bg-surface-secondary transition-colors"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-action-primary-focus-ring/30"
                  :checked="selectedComandaIds.includes(comanda.id)"
                  :aria-label="`Seleccionar comanda ${comanda.comandaNumber}`"
                  @change="toggleComandaSelection(comanda.id)"
                />
                <span class="min-w-0 flex-1">
                  <span class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-text-primary truncate">
                      #{{ comanda.comandaNumber }} · {{ comanda.stationName }}
                    </span>
                    <span class="text-[10px] font-semibold text-text-tertiary whitespace-nowrap">
                      {{ formatComandaTime(comanda.firedAt) }}
                    </span>
                  </span>
                  <span class="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-secondary min-w-0">
                    <span class="font-medium">{{ comanda.itemCount }} {{ comanda.itemCount === 1 ? 'ítem' : 'ítems' }}</span>
                    <span v-if="statusLabel(comanda.status)" class="text-text-tertiary">· {{ statusLabel(comanda.status) }}</span>
                    <span v-if="comanda.itemPreview" class="truncate">· {{ comanda.itemPreview }}</span>
                  </span>
                </span>
              </label>
            </div>
            <button
              type="button"
              :disabled="!canPrintComandas || selectedComandaCount === 0"
              class="w-full min-h-[44px] rounded-xl border border-border text-text-secondary text-xs font-medium flex items-center justify-center gap-1 hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
              :aria-label="checkoutComandasPrintLabel"
              @click="handlePrintComandas"
            >
              <svg class="h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18M6.72 13.829 6.34 18m10.94-4.171L17.66 18M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.75A2.25 2.25 0 0 1 5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75v6A2.25 2.25 0 0 1 18.75 18h-1.09M6.34 18h11.32" />
              </svg>
              {{ checkoutComandasPrintLabel }}
            </button>
          </div>
        </div>

        <!-- WAROS CARD (desktop) — accordion -->
        <div
          v-if="warosPanelVisible"
          class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
        >
          <button
            @click="activeAccordion = activeAccordion === 'waros' ? null : 'waros'"
            class="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-surface-secondary/40 transition-colors min-h-[52px]"
          >
            <svg class="h-4 w-4 text-state-warning-icon flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
            </svg>
            <span class="font-semibold text-sm text-text-primary">Waros</span>
            <span v-if="!isLoadingWaros" class="ml-auto text-sm font-bold tabular-nums text-state-warning-text">
              {{ warosBalance.toLocaleString('es-CO') }}
            </span>
            <svg
              class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'waros' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <div v-show="activeAccordion === 'waros'" class="border-t border-border px-5 py-4 space-y-4">
            <div v-if="isLoadingWaros || isWalletPending" class="grid grid-cols-3 gap-2">
              <div v-for="i in 3" :key="i" class="animate-pulse bg-surface-secondary rounded-lg h-12" />
            </div>
            <div v-else class="grid grid-cols-3 gap-2">
              <div class="rounded-lg bg-surface-secondary/70 px-2 py-2 text-center">
                <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Puntos</p>
                <p class="text-sm font-bold tabular-nums text-text-primary leading-tight mt-0.5">
                  {{ warosBalance.toLocaleString('es-CO') }}
                </p>
              </div>
              <div class="rounded-lg bg-surface-secondary/70 px-2 py-2 text-center">
                <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Wallet</p>
                <p class="text-sm font-bold tabular-nums text-text-primary leading-tight mt-0.5">
                  {{ formatCurrency(walletBalanceCop) }}
                </p>
              </div>
              <div v-if="warosEarnBlockVisible" class="rounded-lg bg-surface-secondary/70 px-2 py-2 text-center">
                <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Gana</p>
                <p class="text-sm font-bold tabular-nums leading-tight mt-0.5" :class="warosEarnEligible ? 'text-state-success-text' : 'text-text-tertiary'">
                  <span v-if="isLoadingEstimate" class="inline-block h-4 w-8 rounded bg-surface-secondary animate-pulse" />
                  <span v-else-if="!warosEarnEligible">—</span>
                  <span v-else-if="estimatedWaros === null">—</span>
                  <span v-else>+{{ estimatedWaros.toLocaleString('es-CO') }}</span>
                </p>
              </div>
            </div>

            <template v-if="waroRedemptionEnabled">
              <div class="space-y-3">
                <p
                  v-if="isLoadingWaroPreview && !waroPreview && selectedWaroReward"
                  class="text-xs text-text-tertiary animate-pulse"
                >
                  Calculando canje…
                </p>

                <ul v-if="activeWaroRewards.length" class="space-y-1.5">
                  <li v-for="reward in activeWaroRewards" :key="reward.id">
                    <label
                      class="flex items-center justify-between gap-3 min-h-[44px] rounded-lg border border-border bg-surface-secondary/40 px-3 py-2"
                      :class="warosBalance >= reward.waros_cost ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
                    >
                      <span class="text-xs font-medium text-text-primary truncate min-w-0">{{ reward.name }}</span>
                      <span class="flex items-center gap-3 flex-shrink-0">
                        <span class="text-xs tabular-nums text-text-secondary">{{ waroRewardSubtitle(reward) }}</span>
                        <span class="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            class="sr-only peer"
                            :checked="selectedWaroReward?.id === reward.id"
                            :disabled="warosBalance < reward.waros_cost"
                            @change="setWaroRewardSelected(reward, ($event.target as HTMLInputElement).checked)"
                          />
                          <span class="block w-10 h-6 bg-control-toggle-track-off rounded-full peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                        </span>
                      </span>
                    </label>
                  </li>
                </ul>

                <p v-if="waroPreviewError" class="text-xs text-destructive">{{ waroPreviewError }}</p>
              </div>
            </template>
          </div>
        </div>

        <!-- Section: Split Payment (Cobro Parcial) — only after customer is set -->
        <div v-if="selectedCustomer" class="bg-surface rounded-2xl border border-border p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-text-primary flex items-center gap-2 text-sm">
              <svg class="h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />
              </svg>
              Cobro Parcial
            </h3>
            <button
              type="button"
              role="switch"
              :aria-checked="splitMode"
              :aria-label="splitMode ? 'Desactivar cobro parcial' : 'Activar cobro parcial'"
              @click="toggleSplitMode"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              :class="splitMode ? 'bg-primary' : 'bg-border'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 rounded-full bg-control-toggle-thumb shadow transform ring-0 transition duration-200"
                :class="splitMode ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Split panel -->
          <div v-if="splitMode" class="mt-3 space-y-3">

            <!-- Payment history -->
            <div v-if="splitPayments.length > 0">
              <!-- Header: count + paid so far -->
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Pagos registrados
                </span>
                <span class="text-xs font-bold text-primary tabular-nums">
                  {{ splitPayments.length }} · {{ formatCurrency(splitPaidTotal) }}
                </span>
              </div>
              <!-- Payment rows -->
              <div class="space-y-1.5">
                <div
                  v-for="(p, idx) in splitPayments"
                  :key="p.id"
                  class="flex items-center gap-2.5 px-3 py-2 bg-surface-secondary rounded-lg text-sm"
                >
                  <!-- Check icon -->
                  <svg class="h-4 w-4 text-state-success-icon flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-text-secondary flex-1">#{{ idx + 1 }} · {{ p.payment_method_name }}</span>
                  <span class="font-semibold text-text-primary tabular-nums">{{ formatCurrency(p.amount) }}</span>
                  <!-- Issue warocol.com#649 — void this partial payment -->
                  <button
                    type="button"
                    :disabled="isVoidingPayment === p.id"
                    @click="openVoidPaymentModal(p)"
                    :aria-label="`Eliminar pago #${idx + 1} de ${formatCurrency(p.amount)}`"
                    class="ml-1 p-1 rounded text-text-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  >
                    <svg v-if="isVoidingPayment === p.id" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <svg v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- warocol.com#737 — settlement total includes tip when selected -->
            <div
              v-if="tipAmount > 0"
              class="rounded-lg border border-border bg-surface-secondary/60 px-3 py-2.5 space-y-1.5 text-sm"
            >
              <div class="flex items-center justify-between text-text-secondary">
                <span>Total orden</span>
                <span class="tabular-nums font-medium text-text-primary">{{ formatCurrency(discountedTotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-text-secondary">
                <span>Propina</span>
                <span class="tabular-nums font-medium text-text-primary">{{ formatCurrency(tipAmount) }}</span>
              </div>
              <div
                v-if="tipTaxAmount > 0"
                class="flex items-center justify-between text-text-secondary"
              >
                <span>{{ tipTaxLabel }}</span>
                <span class="tabular-nums font-medium text-text-primary">{{ formatCurrency(tipTaxAmount) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-border pt-1.5 font-semibold text-text-primary">
                <span>Total a cobrar</span>
                <span class="tabular-nums">{{ formatCurrency(splitAmountDue) }}</span>
              </div>
            </div>

            <!-- Remaining counter -->
            <div
              class="flex items-center justify-between px-3 py-2.5 rounded-lg"
              :class="splitIsComplete ? 'bg-state-success-bg ' : 'bg-primary/10'"
            >
              <span class="text-sm font-medium flex items-center gap-1.5" :class="splitIsComplete ? 'text-state-success-text ' : 'text-primary'">
                <svg v-if="splitIsComplete" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                </svg>
                {{ splitIsComplete ? 'Cobro completo' : 'Saldo pendiente' }}
              </span>
              <span
                class="text-sm font-bold tabular-nums"
                :class="splitIsComplete ? 'text-state-success-text ' : 'text-text-primary'"
                aria-live="polite"
              >{{ formatCurrency(splitRemaining) }}</span>
            </div>

            <!-- Partial amount input -->
            <div v-if="!splitIsComplete" class="flex flex-col gap-1">
              <label class="text-xs font-medium text-text-secondary">Monto a cobrar ahora</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-secondary pointer-events-none">$</span>
                <input
                  type="text"
                  inputmode="numeric"
                  :value="splitPartialAmount ? splitPartialAmount.toLocaleString('es-CO') : ''"
                  @input="onSplitAmountInput"
                  class="w-full pl-7 pr-4 py-3 min-h-[44px] bg-surface-secondary border border-border rounded-xl text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary tabular-nums"
                  :class="splitAmountValidationMessage ? 'border-state-danger-border focus:border-state-danger-border focus:ring-state-danger-border/30' : ''"
                  placeholder="0"
                />
              </div>
              <p
                v-if="splitPaymentValidationMessage"
                class="text-xs font-medium text-state-danger-text"
              >
                {{ splitPaymentValidationMessage }}
              </p>
            </div>

            <!-- Issue #524 — Cash tender + change calculation (split mode) -->
            <CheckoutCashTenderPanel
              v-if="isCashMethod && !splitIsComplete"
              v-model="cashReceivedInput"
              input-id="cash-received-input"
              :amount-to-charge="cashAmountToCharge"
              require-input-for-feedback
            />

            <!-- Add payment button -->
            <button
              v-if="!splitIsComplete"
              type="button"
              :disabled="isAddingPayment || !selectedPaymentMethod || requiresMethodSelection || !splitAmountToCharge || splitAmountToCharge <= 0 || !selectedCustomer || (!isKitchenServiceMode && !posStore.cartId) || !cashIsValid || !manualDiscountIsValid || !!walletTenderValidationMessage || !!splitPaymentValidationMessage"
              @click="addSplitPayment"
              class="w-full min-h-[44px] px-4 py-3 bg-action-primary-bg text-action-primary-text text-sm font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <UiLoadingDots v-if="isAddingPayment" size="10px" />
              <span v-else>Cobrar {{ formatCurrency(splitAmountToCharge) }} · {{ getPaymentMethodLabel(selectedPaymentMethod) }}</span>
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="processingError" class="bg-state-danger-bg  border-2 border-state-danger-border  rounded-xl p-4">
          <div class="flex items-start gap-3">
            <span class="text-xl">⚠️</span>
            <p class="text-sm text-state-danger-text ">{{ processingError }}</p>
          </div>
        </div>

        <!-- Issue #524 — Cash tender + change calculation (single-payment mode) -->
        <CheckoutCashTenderPanel
          v-if="!splitMode && isCashMethod && selectedCustomer"
          v-model="cashReceivedInput"
          input-id="cash-received-input-single"
          :amount-to-charge="cashAmountToCharge"
        />

        <!-- Pre-checkout banner: items will fire to kitchen on checkout (counter mode only) -->
        <div
          v-if="comandasEnabled && isCounterMode && cartItems.length > 0"
          role="status"
          class="flex items-center gap-3 min-h-[44px] px-4 py-3 bg-state-warning-bg border border-state-warning-border rounded-xl"
        >
          <div class="flex-shrink-0 bg-state-warning-bg p-1.5 rounded-lg">
            <svg class="w-4 h-4 text-state-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
            </svg>
          </div>
          <p class="text-sm text-state-warning-text font-medium">Los ítems serán enviados a cocina al cobrar</p>
        </div>

        <!-- Action Buttons (always visible) -->
        <div class="flex flex-col gap-2">
          <button
            @click="processOrder"
            v-if="!splitMode"
            :disabled="isProcessing || !selectedCustomer || isLoadingEstimate || requiresMethodSelection || !cashIsValid || !manualDiscountIsValid || !!walletTenderValidationMessage"
            class="w-full bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UiLoadingDots v-if="isProcessing" size="9px" />
            <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span v-if="!isProcessing">
              {{ isDeferredDeliveryPayment
                ? 'Dejar venta pendiente'
                : selectedPaymentMethod === 'credit'
                ? 'Registrar como crédito'
                : tipAmount > 0 || mesaAdvanceAppliedEstimate > 0
                  ? `Confirmar — ${formatCurrency(finalAmountToCollect)}`
                  : 'Confirmar Orden' }}
            </span>
            <svg v-if="!isProcessing" class="h-5 w-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <p v-if="!selectedCustomer && !isProcessing" class="text-center text-xs text-text-tertiary">Identifica al cliente para continuar</p>

          <!-- Issue #535 — Imprimir prefactura (pre-cuenta para revisión del cliente) -->
          <button
            v-if="cartItems.length > 0"
            type="button"
            :disabled="prefacturaDisabled"
            :title="prefacturaDisabled ? 'Calculando impuestos…' : 'Imprime una pre-cuenta para revisión del cliente. No es una factura.'"
            @click="printPrefactura"
            class="w-full bg-surface border-2 border-border hover:border-primary hover:text-primary text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
            aria-label="Imprimir prefactura para revisión del cliente"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0H6.34m11.318 0a23.97 23.97 0 01-3.42-1.5m3.42 1.5l.42-.5m-3.84 1.5a23.97 23.97 0 003.42-1.5M14.25 9.75v.01m-3-.01v.01m-3-.01v.01M7.5 6.75h9a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75z" />
            </svg>
            <span>Imprimir prefactura</span>
          </button>

          <!-- Issue #537 — Estado de comandas (expediter) -->
          <button
            v-if="expediterEnabled && comandasEnabled && (isMesaMode || posStore.activeTableSession)"
            type="button"
            class="w-full bg-surface border-2 border-border hover:border-primary hover:text-primary text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
            aria-label="Ver estado de comandas"
            @click="showExpediterPanel = true"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Estado de comandas</span>
          </button>

          <button
            @click="cancelOrder"
            class="w-full bg-surface border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Cancelar
          </button>
        </div>

        <!-- Security Note -->
        <div class="flex items-center justify-center gap-2 text-xs text-text-tertiary">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <span>Transacción segura y encriptada</span>
        </div>

      </div>

    </div>

    <!-- Mobile Bottom Summary -->
    <div
      v-if="cartItems.length > 0 && !isSyncingCart && !syncError"
      class="lg:hidden mt-6 pb-4 space-y-3"
    >
      <!-- Live promotion hint — checkout footer (warocol.com#983) -->
      <div
        v-if="hasActivePromos"
        role="status"
        class="flex items-center gap-3 min-h-[44px] px-4 py-3 bg-status-success-bg border border-status-success-text/25 rounded-xl"
      >
        <div class="flex-shrink-0 bg-status-success-text/15 p-1.5 rounded-lg">
          <svg class="w-4 h-4 text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <p class="text-sm text-status-success-text font-medium">
          Promo activa: {{ activePromoHint }}
        </p>
      </div>

      <!-- ACCORDION: Customer Insights (same as desktop) -->
      <div
        v-if="insightsLoading || (customerInsights && customerInsights.orders_count > 0)"
        class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        <button
          @click="activeAccordion = activeAccordion === 'insights' ? null : 'insights'"
          class="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-surface-secondary/40 transition-colors"
        >
          <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 select-none">
            {{ selectedCustomer?.name?.charAt(0)?.toUpperCase() || selectedCustomer?.phone_number?.charAt(0) || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-text-primary text-sm leading-tight truncate">
              {{ selectedCustomer?.name || 'Cliente' }}
            </p>
            <p class="text-xs text-text-secondary leading-tight mt-0.5">{{ selectedCustomer?.phone_number }}</p>
          </div>
          <svg
            class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
            :class="activeAccordion === 'insights' ? 'rotate-0' : 'rotate-180'"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <div v-show="activeAccordion === 'insights'" class="border-t border-border">
          <div v-if="insightsLoading" class="p-4 grid grid-cols-2 gap-2.5">
            <div v-for="i in 4" :key="i" class="bg-surface-secondary rounded-xl p-4 flex flex-col gap-2 animate-pulse">
              <div class="h-4 w-4 rounded bg-surface"></div>
              <div class="h-5 w-16 rounded bg-surface mt-1"></div>
              <div class="h-3 w-12 rounded bg-surface"></div>
            </div>
          </div>
          <PosCustomerInsightsCard v-else-if="customerInsights" :insights="customerInsights" />
        </div>
      </div>

      <!-- ACCORDION: Resumen de la Orden -->
      <div class="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg">
        <button
          @click="activeAccordion = activeAccordion === 'summary' ? null : 'summary'"
          class="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-secondary/40 transition-colors"
        >
          <h3 class="font-bold text-text-primary">Resumen de la Orden</h3>
          <svg
            class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
            :class="activeAccordion === 'summary' ? 'rotate-0' : 'rotate-180'"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <div v-show="activeAccordion === 'summary'" class="border-t border-border px-5 py-4">
          <div class="space-y-3 mb-4">
            <div class="flex justify-between text-sm text-text-secondary">
              <span>Subtotal ({{ cartItems.length }} productos)</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(cartTotal) }}</span>
            </div>
            <div v-if="promoSavings > 0" class="flex justify-between text-sm text-state-success-text ">
              <span>Promoción</span>
              <span class="font-medium">- {{ formatCurrency(promoSavings) }}</span>
            </div>
            <div
              v-for="(promo, promoIdx) in displayPromoBreakdown"
              v-show="displayPromoBreakdown.length > 1"
              :key="promo.promotion_id ?? promo.promotion_name ?? promoIdx"
              class="flex justify-between text-xs text-state-success-text/90  pl-3"
            >
              <span>{{ promo.promotion_name }}</span>
              <span class="font-medium">- {{ formatCurrency(promo.savings) }}</span>
            </div>
            <div
              v-if="promoSavings > 0"
              class="flex justify-between text-sm text-text-secondary"
            >
              <span>Subtotal con promoción</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(subtotalAfterPromos) }}</span>
            </div>
            <div v-if="discountEnabled && discountAmount > 0" class="flex justify-between text-sm text-state-success-text ">
              <span>Descuento manual</span>
              <span class="font-medium">- {{ formatCurrency(discountAmount) }}</span>
            </div>
            <div v-if="waroDiscountCop > 0" class="flex justify-between text-sm text-state-warning-text">
              <span>{{ waroRewardLabel ? `WaRo: ${waroRewardLabel}` : 'Canje WaRo' }}</span>
              <span class="font-medium">- {{ formatCurrency(waroDiscountCop) }}</span>
            </div>
            <div class="flex justify-between text-sm text-text-secondary">
              <span>{{ taxPreview ? taxPreview.standard_tax_label : 'Impuestos (0%)' }}</span>
              <span class="font-medium text-text-primary">
                {{ formatCurrency(taxPreview ? (taxPreview.standard_tax + taxPreview.liquor_tax) : 0) }}
              </span>
            </div>
            <div
              v-if="tipAmount > 0"
              class="flex justify-between text-sm text-text-secondary"
            >
              <span>{{ receiptTipLabel }}</span>
              <span class="font-medium text-text-primary tabular-nums">{{ formatCurrency(tipAmount) }}</span>
            </div>
            <div
              v-if="tipAmount > 0 && tipTaxAmount > 0"
              class="flex justify-between text-sm text-text-secondary"
            >
              <span>{{ tipTaxLabel }}</span>
              <span class="font-medium text-text-primary tabular-nums">{{ formatCurrency(tipTaxAmount) }}</span>
            </div>
          </div>
          <div class="border-t border-dashed border-border pt-4">
            <div
              v-if="tipAmount > 0 || checkoutSummaryAdvanceApplied > 0"
              class="flex justify-between text-sm text-text-secondary mb-2"
            >
              <span>Total orden</span>
              <span class="font-medium text-text-primary tabular-nums">{{ formatCurrency(checkoutSummaryOrderTotal) }}</span>
            </div>
            <div
              v-if="checkoutSummaryAdvanceApplied > 0"
              class="flex justify-between text-sm text-state-success-text mb-2"
            >
              <span>Anticipo mesa</span>
              <span class="font-medium tabular-nums">- {{ formatCurrency(checkoutSummaryAdvanceApplied) }}</span>
            </div>
            <div class="flex justify-between items-end mb-1">
              <span class="text-text-secondary font-medium">Total a Pagar</span>
              <span class="text-3xl font-bold text-primary tabular-nums">{{ formatCurrency(checkoutSummaryAmountDue) }}</span>
            </div>
            <p class="text-right text-xs text-text-tertiary">COP</p>
          </div>
        </div>
      </div>

      <!-- ACCORDION: Comandas -->
      <div
        v-if="showCheckoutComandas"
        class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        <button
          type="button"
          @click="activeAccordion = activeAccordion === 'comandas' ? null : 'comandas'"
          class="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-surface-secondary/40 transition-colors"
        >
          <span class="font-bold text-text-primary flex items-center gap-2">
            <svg class="h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3.75h10.5A2.25 2.25 0 0 1 19.5 6v14.25l-2.625-1.5-2.625 1.5-2.625-1.5-2.625 1.5-2.625-1.5-2.625 1.5V6a2.25 2.25 0 0 1 2.25-2.25Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 8.25h7.5M8.25 12h7.5M8.25 15.75h4.5" />
            </svg>
            Comandas
          </span>
          <span class="ml-auto text-xs font-semibold text-text-secondary">
            {{ selectedComandaCount }}/{{ sentComandasForCheckout.length }}
          </span>
          <svg
            class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
            :class="activeAccordion === 'comandas' ? 'rotate-0' : 'rotate-180'"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>

        <div v-show="activeAccordion === 'comandas'" class="border-t border-border px-5 py-4 space-y-3">
          <div v-if="checkoutComandasLoading" class="space-y-2">
            <div v-for="i in 2" :key="i" class="h-14 rounded-lg bg-surface-secondary animate-pulse" />
          </div>
          <div
            v-else-if="sentComandasForCheckout.length === 0"
            class="rounded-lg border border-border bg-surface-secondary/50 px-3 py-3 text-sm text-text-secondary"
          >
            No hay comandas enviadas para esta sesión.
          </div>
          <div v-else class="space-y-1.5">
            <label
              v-for="comanda in sentComandasForCheckout"
              :key="comanda.id"
              class="flex items-start gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 cursor-pointer hover:bg-surface-secondary transition-colors"
            >
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-action-primary-focus-ring/30"
                :checked="selectedComandaIds.includes(comanda.id)"
                :aria-label="`Seleccionar comanda ${comanda.comandaNumber}`"
                @change="toggleComandaSelection(comanda.id)"
              />
              <span class="min-w-0 flex-1">
                <span class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold text-text-primary truncate">
                    #{{ comanda.comandaNumber }} · {{ comanda.stationName }}
                  </span>
                  <span class="text-[10px] font-semibold text-text-tertiary whitespace-nowrap">
                    {{ formatComandaTime(comanda.firedAt) }}
                  </span>
                </span>
                <span class="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-secondary min-w-0">
                  <span class="font-medium">{{ comanda.itemCount }} {{ comanda.itemCount === 1 ? 'ítem' : 'ítems' }}</span>
                  <span v-if="statusLabel(comanda.status)" class="text-text-tertiary">· {{ statusLabel(comanda.status) }}</span>
                  <span v-if="comanda.itemPreview" class="truncate">· {{ comanda.itemPreview }}</span>
                </span>
              </span>
            </label>
          </div>
          <button
            type="button"
            :disabled="!canPrintComandas || selectedComandaCount === 0"
            class="w-full min-h-[44px] rounded-xl border border-border text-text-secondary text-xs font-medium flex items-center justify-center gap-1 hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
            :aria-label="checkoutComandasPrintLabel"
            @click="handlePrintComandas"
          >
            <svg class="h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18M6.72 13.829 6.34 18m10.94-4.171L17.66 18M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.75A2.25 2.25 0 0 1 5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75v6A2.25 2.25 0 0 1 18.75 18h-1.09M6.34 18h11.32" />
            </svg>
            {{ checkoutComandasPrintLabel }}
          </button>
        </div>
      </div>

      <!-- WAROS CARD (mobile) -->
      <div
        v-if="warosPanelVisible"
        class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        <div class="px-5 py-4 space-y-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold text-text-primary text-sm">Waros</h3>
            <span v-if="!isLoadingWaros" class="text-sm font-bold tabular-nums text-state-warning-text">
              {{ warosBalance.toLocaleString('es-CO') }}
            </span>
          </div>
          <div v-if="isLoadingWaros || isWalletPending" class="grid grid-cols-3 gap-2">
            <div v-for="i in 3" :key="i" class="animate-pulse bg-surface-secondary rounded-lg h-12" />
          </div>
          <div v-else class="grid grid-cols-3 gap-2">
            <div class="rounded-lg bg-surface-secondary/70 px-2 py-2 text-center">
              <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Puntos</p>
              <p class="text-sm font-bold tabular-nums text-text-primary leading-tight mt-0.5">
                {{ warosBalance.toLocaleString('es-CO') }}
              </p>
            </div>
            <div class="rounded-lg bg-surface-secondary/70 px-2 py-2 text-center">
              <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Wallet</p>
              <p class="text-sm font-bold tabular-nums text-text-primary leading-tight mt-0.5">
                {{ formatCurrency(walletBalanceCop) }}
              </p>
            </div>
            <div v-if="warosEarnBlockVisible" class="rounded-lg bg-surface-secondary/70 px-2 py-2 text-center">
              <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Gana</p>
              <p class="text-sm font-bold tabular-nums leading-tight mt-0.5" :class="warosEarnEligible ? 'text-state-success-text' : 'text-text-tertiary'">
                <span v-if="isLoadingEstimate" class="inline-block h-4 w-8 rounded bg-surface-secondary animate-pulse" />
                <span v-else-if="!warosEarnEligible">—</span>
                <span v-else-if="estimatedWaros === null">—</span>
                <span v-else>+{{ estimatedWaros.toLocaleString('es-CO') }}</span>
              </p>
            </div>
          </div>
          <template v-if="waroRedemptionEnabled">
            <div class="space-y-3">
              <p v-if="isLoadingWaroPreview && !waroPreview && selectedWaroReward" class="text-xs text-text-tertiary animate-pulse">
                Calculando canje…
              </p>
              <ul v-if="activeWaroRewards.length" class="space-y-1.5">
                <li v-for="reward in activeWaroRewards" :key="reward.id">
                  <label
                    class="flex items-center justify-between gap-3 min-h-[44px] rounded-lg border border-border bg-surface-secondary/40 px-3 py-2"
                    :class="warosBalance >= reward.waros_cost ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
                  >
                    <span class="text-xs font-medium text-text-primary truncate min-w-0">{{ reward.name }}</span>
                    <span class="flex items-center gap-3 flex-shrink-0">
                      <span class="text-xs tabular-nums text-text-secondary">{{ waroRewardSubtitle(reward) }}</span>
                      <span class="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          class="sr-only peer"
                          :checked="selectedWaroReward?.id === reward.id"
                          :disabled="warosBalance < reward.waros_cost"
                          @change="setWaroRewardSelected(reward, ($event.target as HTMLInputElement).checked)"
                        />
                        <span class="block w-10 h-6 bg-control-toggle-track-off rounded-full peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </span>
                    </span>
                  </label>
                </li>
              </ul>
              <p v-if="waroPreviewError" class="text-xs text-destructive">{{ waroPreviewError }}</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="processingError" class="bg-state-danger-bg  border-2 border-state-danger-border  rounded-xl p-4">
        <div class="flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <p class="text-sm text-state-danger-text ">{{ processingError }}</p>
        </div>
      </div>

      <!-- Pre-checkout banner: items will fire to kitchen on checkout (counter mode only) -->
      <div
        v-if="comandasEnabled && isCounterMode && cartItems.length > 0"
        role="status"
        class="flex items-center gap-3 min-h-[44px] px-4 py-3 bg-state-warning-bg border border-state-warning-border rounded-xl"
      >
        <div class="flex-shrink-0 bg-state-warning-bg p-1.5 rounded-lg">
          <svg class="w-4 h-4 text-state-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
          </svg>
        </div>
        <p class="text-sm text-state-warning-text font-medium">Los ítems serán enviados a cocina al cobrar</p>
      </div>

      <!-- Issue #524 — Cash tender (mobile / tablet; desktop uses right column) -->
      <CheckoutCashTenderPanel
        v-if="!splitMode && isCashMethod && selectedCustomer"
        v-model="cashReceivedInput"
        input-id="cash-received-input-mobile"
        :amount-to-charge="cashAmountToCharge"
      />

      <!-- Action Buttons -->
      <div class="flex flex-col gap-2">
        <button
          @click="processOrder"
          v-if="!splitMode"
          :disabled="isProcessing || !selectedCustomer || isLoadingEstimate || requiresMethodSelection || !cashIsValid || !manualDiscountIsValid || !!walletTenderValidationMessage"
          class="w-full bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UiLoadingDots v-if="isProcessing" size="9px" />
          <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span v-if="!isProcessing">
            {{ isDeferredDeliveryPayment ? 'Dejar venta pendiente' : selectedPaymentMethod === 'credit' ? 'Registrar como crédito' : 'Confirmar Orden' }}
          </span>
        </button>
        <p v-if="!selectedCustomer && !isProcessing" class="text-center text-xs text-text-tertiary">Identifica al cliente para continuar</p>

        <!-- Issue #535 — Imprimir prefactura (pre-cuenta para revisión del cliente) -->
        <button
          v-if="cartItems.length > 0"
          type="button"
          :disabled="prefacturaDisabled"
          :title="prefacturaDisabled ? 'Calculando impuestos…' : 'Imprime una pre-cuenta para revisión del cliente. No es una factura.'"
          @click="printPrefactura"
          class="w-full bg-surface border-2 border-border hover:border-primary hover:text-primary text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
          aria-label="Imprimir prefactura para revisión del cliente"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0H6.34m11.318 0a23.97 23.97 0 01-3.42-1.5m3.42 1.5l.42-.5m-3.84 1.5a23.97 23.97 0 003.42-1.5M14.25 9.75v.01m-3-.01v.01m-3-.01v.01M7.5 6.75h9a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75z" />
          </svg>
          <span>Imprimir prefactura</span>
        </button>

        <button
          @click="cancelOrder"
          class="w-full bg-surface border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          Cancelar
        </button>
      </div>

      <!-- Security Note -->
      <div class="flex items-center justify-center gap-2 text-xs text-text-tertiary">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
        <span>Transacción segura y encriptada</span>
      </div>
    </div>

    <!-- Success Modal -->
    <!-- Issue warocol.com#649 — Void partial payment modal -->
    <Teleport to="body">
      <div
        v-if="voidPaymentTarget"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="void-payment-title"
      >
        <div class="absolute inset-0 bg-overlay-backdrop/50" @click="closeVoidPaymentModal" />
        <div class="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full flex items-center justify-center bg-destructive/10">
              <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m11.456-.397a48.11 48.11 0 0 0-3.478-.397m0 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <div>
              <h3 id="void-payment-title" class="font-bold text-text-primary text-lg leading-tight">Eliminar pago</h3>
              <p class="text-sm text-text-secondary mt-0.5">
                {{ formatCurrency(voidPaymentTarget.amount) }} · {{ voidPaymentTarget.payment_method_name }}
              </p>
            </div>
          </div>

          <p
            v-if="voidPaymentTarget.payment_method === 'cash'"
            class="flex items-start gap-2 text-sm text-state-warning-text bg-state-warning-bg border border-state-warning-border rounded-lg p-3 mb-4"
          >
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Pago en efectivo — recuerda devolver físicamente el dinero al cliente antes de confirmar.</span>
          </p>

          <label for="void-payment-reason" class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
            Motivo <span class="text-text-tertiary normal-case">(opcional)</span>
          </label>
          <textarea
            id="void-payment-reason"
            v-model="voidPaymentReason"
            rows="2"
            :disabled="isVoidingPayment === voidPaymentTarget.id"
            placeholder="Ej: cobro registrado por error"
            class="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 disabled:opacity-50"
          />

          <p v-if="voidPaymentError" class="mt-3 text-sm text-destructive flex items-start gap-2">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ voidPaymentError }}</span>
          </p>

          <div class="flex gap-2 mt-5">
            <button
              type="button"
              :disabled="isVoidingPayment === voidPaymentTarget.id"
              @click="closeVoidPaymentModal"
              class="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary text-sm font-semibold hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >Cancelar</button>
            <button
              type="button"
              :disabled="isVoidingPayment === voidPaymentTarget.id"
              @click="confirmVoidPayment"
              class="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-action-destructive-bg text-action-destructive-text text-sm font-semibold hover:bg-action-destructive-hover-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <UiLoadingDots v-if="isVoidingPayment === voidPaymentTarget.id" size="8px" />
              <span v-else>Eliminar pago</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showSuccessModal"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-overlay-backdrop/50"></div>

        <!-- Modal -->
        <div class="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-5 shadow-xl">
          <!-- Icon -->
          <div class="flex justify-center mb-3">
            <div class="w-14 h-14 rounded-full flex items-center justify-center bg-state-success-bg ">
              <svg
                class="w-7 h-7 text-state-success-text "
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h3 class="text-xl font-bold leading-tight text-text-primary text-center mb-1.5">
            {{
              orderResult?.status === 'pending'
                ? 'Venta pendiente'
                : orderResult?.payment_method === 'credit'
                  ? 'Venta a crédito registrada'
                  : 'Venta Completada'
            }}
          </h3>
          <p class="text-sm leading-snug text-text-secondary text-center mb-4">
            {{
              orderResult?.status === 'pending'
                ? 'Finalízala desde ventas cuando conozcas el método de pago.'
                : orderResult?.payment_method === 'credit'
                  ? 'El saldo queda pendiente en cartera.'
                  : 'La orden fue procesada exitosamente.'
            }}
          </p>

          <!-- Credit notice banner -->
          <div v-if="orderResult?.payment_method === 'credit'" class="mb-3 rounded-lg border border-state-warning-border/70 bg-state-warning-bg/70 px-3 py-2.5">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-state-warning-text flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p class="text-xs font-medium leading-snug text-state-warning-text">Abonos y saldo: perfil del cliente.</p>
            </div>
          </div>

          <!-- Order Details -->
          <div v-if="orderResult" class="bg-background rounded-lg border border-border p-3 mb-4 space-y-2.5">
            <div v-if="(orderResult?.order_number ?? 0) > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">Nº Orden</span>
              <span class="text-lg font-bold leading-none text-primary">#{{ orderResult?.order_number ?? '' }}</span>
            </div>
            <div
              v-if="orderResult && (orderResult.promo_savings || orderResult.discount_amount || orderResult.waro_discount_cop) && orderResult.subtotal"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-text-secondary">Subtotal</span>
              <span class="text-sm font-medium text-text-primary">{{ formatCurrency(orderResult.subtotal) }}</span>
            </div>
            <div
              v-for="promo in (orderResult.promo_breakdown ?? [])"
              :key="promo.promotion_id ?? promo.promotion_name"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-state-success-text ">{{ promo.promotion_name }}</span>
              <span class="text-sm font-medium text-state-success-text ">-{{ formatCurrency(promo.savings) }}</span>
            </div>
            <div v-if="orderResult.discount_amount" class="flex items-center justify-between gap-3">
              <span class="text-sm text-primary">Descuento manual</span>
              <span class="text-sm font-medium text-primary">-{{ formatCurrency(orderResult.discount_amount) }}</span>
            </div>
            <div v-if="orderResultWaroDiscountCop > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-state-warning-text">{{ orderResultWaroLineLabel }}</span>
              <span class="text-sm font-medium text-state-warning-text">-{{ formatCurrency(orderResultWaroDiscountCop) }}</span>
            </div>
            <div v-if="orderResult.standard_tax && orderResult.standard_tax > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ orderResult.standard_tax_label ?? 'Impuesto' }}</span>
              <span class="text-sm font-medium text-text-primary">{{ formatCurrency(orderResult.standard_tax) }}</span>
            </div>
            <div v-if="orderResult.liquor_tax && orderResult.liquor_tax > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">IVA licores 5%</span>
              <span class="text-sm font-medium text-text-primary">{{ formatCurrency(orderResult.liquor_tax) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3" :class="(orderResult.discount_amount || orderResult.waro_discount_cop || orderResult.standard_tax || orderResult.liquor_tax) ? 'border-t border-border pt-2.5' : ''">
              <span class="text-sm text-text-secondary">Total</span>
              <span class="text-base font-bold text-text-primary">{{ formatCurrency(orderResult.total_amount) }}</span>
            </div>
            <!-- warocol.com#639 — show tip on a separate line + the total charged to the customer -->
            <div v-if="orderResult.tip_amount && orderResult.tip_amount > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">Propina</span>
              <span class="text-sm font-medium text-text-primary">{{ formatCurrency(orderResult.tip_amount) }}</span>
            </div>
            <div v-if="orderResult.advance_applied && orderResult.advance_applied > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-state-success-text">Anticipo mesa</span>
              <span class="text-sm font-medium text-state-success-text">-{{ formatCurrency(orderResult.advance_applied) }}</span>
            </div>
            <div
              v-if="(orderResult.tip_amount && orderResult.tip_amount > 0) || (orderResult.advance_applied && orderResult.advance_applied > 0)"
              class="flex items-center justify-between gap-3 rounded-md bg-primary/5 px-2.5 py-2"
            >
              <span class="text-sm font-semibold text-text-primary">Total cobrado</span>
              <span class="text-lg font-bold leading-none text-primary">
                {{ formatCurrency(orderResultChargedAmount) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3 min-w-0">
              <span class="text-sm text-text-secondary shrink-0">Método de Pago</span>
              <span class="text-sm font-medium text-text-primary min-w-0 overflow-x-auto whitespace-nowrap text-right">
                {{
                  orderResult.payment_method
                    ? (orderResult.payment_method_name
                        ? `${getPaymentMethodLabel(orderResult.payment_method)} · ${orderResult.payment_method_name}`
                        : getPaymentMethodLabel(orderResult.payment_method))
                    : 'Pendiente por definir'
                }}
              </span>
            </div>
          </div>

          <!-- Electronic invoice (DIAN) — cashier triggers emission, but never sees CUFE/PDF -->
          <div v-if="orderResult?.status !== 'pending' && (orderResult?.order_id || (orderResult?.order_ids?.length ?? 0) > 0)" class="mb-4">
            <!-- Not requested yet — gated on tenant readiness (#450) -->
            <template v-if="isInvoicingReady && !isReadinessLoading && !isCreditOnlyInvoiceBlocked && !invoiceResult && !invoiceLoading && !invoiceError && !fiscalWizardOpen">
              <button
                @click="requestInvoice"
                class="w-full min-h-[44px] py-2 px-4 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                {{ (orderResult?.order_ids?.length ?? 0) > 1 ? `Facturar ${orderResult?.order_ids?.length} órdenes` : 'Generar factura electrónica DIAN' }}
              </button>
            </template>
            <div v-else-if="isCreditOnlyInvoiceBlocked" class="rounded-lg border border-state-warning-border/70 bg-state-warning-bg/70 px-3 py-2 text-xs font-medium leading-snug text-state-warning-text">
              Crédito puro: sin factura DIAN desde POS.
            </div>

            <!-- Inline fiscal-data wizard -->
            <div v-else-if="fiscalWizardOpen" class="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div class="flex items-start gap-3">
                <svg class="h-5 w-5 text-primary mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664" /></svg>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-text-primary">Datos para la factura</p>
                  <p class="text-xs text-text-secondary mt-0.5">Pídele al cliente su tipo y número de documento.</p>
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-medium text-text-primary">Tipo de documento</label>
                <select
                  v-model="fiscalWizardForm.fiscal_id_type"
                  :disabled="fiscalWizardSaving"
                  class="w-full min-h-[44px] px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-sm disabled:opacity-50"
                >
                  <option value="" disabled>Selecciona...</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="NIT">NIT (empresa)</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="PA">Pasaporte</option>
                  <option value="TI">Tarjeta de Identidad</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-medium text-text-primary">Número de documento</label>
                <input
                  v-model="fiscalWizardForm.fiscal_id"
                  type="text"
                  :placeholder="fiscalWizardForm.fiscal_id_type === 'NIT' ? '900123456 (sin DV)' : '1063279307'"
                  :disabled="fiscalWizardSaving"
                  class="w-full min-h-[44px] px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-sm disabled:opacity-50"
                />
                <p v-if="fiscalWizardForm.fiscal_id_type === 'NIT'" class="text-xs text-text-tertiary">Sin dígito de verificación</p>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-medium text-text-primary">
                  {{ fiscalWizardForm.fiscal_id_type === 'NIT' ? 'Razón social' : 'Nombre legal completo' }}
                </label>
                <input
                  v-model="fiscalWizardForm.fiscal_business_name"
                  type="text"
                  :placeholder="fiscalWizardForm.fiscal_id_type === 'NIT' ? 'ACME SAS' : 'Juan Pérez'"
                  :disabled="fiscalWizardSaving"
                  class="w-full min-h-[44px] px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-sm disabled:opacity-50"
                />
              </div>

              <p v-if="fiscalWizardError" class="text-xs text-state-danger-text ">{{ fiscalWizardError }}</p>

              <div class="flex gap-2 pt-1">
                <button
                  type="button"
                  :disabled="fiscalWizardSaving"
                  @click="fiscalWizardOpen = false"
                  class="min-h-[44px] px-3 py-2 text-sm text-text-secondary font-medium border border-border bg-surface rounded-lg hover:bg-surface-secondary transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  :disabled="!fiscalWizardCanSubmit || fiscalWizardSaving"
                  @click="submitFiscalAndInvoice"
                  class="flex-1 min-h-[44px] px-3 py-2 text-sm bg-action-primary-bg text-action-primary-text font-semibold rounded-lg hover:bg-action-primary-hover-bg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg v-if="fiscalWizardSaving" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {{ fiscalWizardSaving ? 'Guardando...' : 'Continuar y emitir' }}
                </button>
              </div>
            </div>

            <!-- Loading -->
            <div v-else-if="invoiceLoading" class="flex items-center justify-center gap-2 py-3 px-4 bg-surface-secondary rounded-lg">
              <UiLoadingDots size="9px" color="currentColor" aria-hidden="true" />
              <span class="text-sm text-text-secondary">{{ invoiceProgress || 'Generando factura DIAN...' }}</span>
            </div>

            <!-- Success — show ONLY invoice number -->
            <div
              v-else-if="invoiceResult?.prefix && invoiceResult?.invoice_number"
              class="rounded-lg border border-state-success-border bg-state-success-bg p-3 text-center"
            >
              <p class="text-xs font-semibold text-state-success-text">Factura generada</p>
              <p class="text-sm font-semibold text-state-success-text mt-1">
                {{ invoiceResult.prefix }}-{{ invoiceResult.invoice_number }}
              </p>
            </div>

            <!-- Error -->
            <div v-else-if="invoiceError" class="rounded-lg border border-state-danger-border bg-state-danger-bg p-3 space-y-2">
              <div class="flex items-start gap-2 text-state-danger-text">
                <svg class="h-4 w-4 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                <div class="min-w-0 space-y-1">
                  <span class="text-sm font-medium block">{{ invoiceError }}</span>
                  <p v-if="isMatiasAuthInvoiceError" class="text-xs opacity-90">
                    Error de autenticación con Matias. Corrige el token y pulsa Reintentar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                :disabled="invoiceLoading"
                @click="retryInvoice"
                class="w-full min-h-[44px] py-2 px-4 bg-surface border border-state-danger-border text-state-danger-text text-sm font-semibold rounded-lg hover:bg-state-danger-bg focus:outline-none focus:ring-2 focus:ring-state-danger-border active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg v-if="invoiceLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {{ invoiceLoading ? 'Reintentando…' : 'Reintentar' }}
              </button>
            </div>
          </div>

          <!-- Receipt actions -->
          <div class="mb-4 space-y-3">
            <!-- Email receipt -->
            <div class="flex flex-col gap-1.5">
              <!-- When email comes from profile: confirmation mode -->
              <template v-if="emailFromProfile && !emailSent">
                <p class="text-sm font-medium text-text-primary">¿Enviar recibo al cliente?</p>
                <div class="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <svg class="h-4 w-4 shrink-0 text-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                  <span class="flex-1 truncate text-sm text-text-primary">{{ receiptEmail }}</span>
                  <button
                    @click="sendReceiptEmail"
                    :disabled="!receiptEmail || isSendingEmail"
                    class="shrink-0 min-h-[36px] px-4 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-action-primary-bg text-action-primary-text hover:bg-action-primary-hover-bg"
                  >
                    <span v-if="isSendingEmail">Enviando...</span>
                    <span v-else>Confirmar envío</span>
                  </button>
                </div>
              </template>

              <!-- When email was sent (from profile or manual) -->
              <template v-else-if="emailSent">
                <div class="flex items-center gap-2 rounded-lg border border-state-success-border bg-state-success-bg px-3 py-2 text-state-success-text">
                  <svg class="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  <span class="text-sm font-medium">Recibo enviado a {{ receiptEmail }}</span>
                </div>
              </template>

              <!-- When no profile email: manual input -->
              <template v-else>
                <label for="receipt-email" class="text-xs font-semibold text-text-secondary">
                  Recibo por correo <span class="font-normal text-text-tertiary">(opcional)</span>
                </label>
                <div class="flex gap-2">
                  <input
                    id="receipt-email"
                    v-model="receiptEmail"
                    type="email"
                    placeholder="cliente@email.com"
                    class="flex-1 px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    @click="sendReceiptEmail"
                    :disabled="!receiptEmail || isSendingEmail"
                    class="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-surface border border-border text-text-primary hover:bg-surface-secondary"
                  >
                    <span v-if="isSendingEmail">Enviando...</span>
                    <span v-else>Enviar</span>
                  </button>
                </div>
              </template>
            </div>

            <!-- Print -->
            <button
              @click="printReceipt"
              class="w-full min-h-[44px] py-2 px-4 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
              </svg>
              Imprimir comprobante
            </button>
          </div>

          <!-- Accept Button -->
          <button
            @click="closeSuccessModal"
            class="w-full py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-lg font-medium hover:bg-action-primary-hover-bg transition-colors"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </Teleport>

  <!-- Issue #535 — Hidden prefactura for printing.
       Only visible via @media print + body class .printing-prefactura.
       The prefactura footer disclaimer is legally relevant — never remove it
       or make it visually less prominent. -->
  <div id="pos-prefactura" aria-hidden="true">
    <PosReceiptPrintHeader
      :fiscal-data="fiscalData"
      :display-name="businessProfile?.display_name"
      :address="businessProfile?.address"
      :city="businessProfile?.city"
      :phone="businessProfile?.phone_number"
      :logo-url="receiptLogoUrl"
    />
    <div class="receipt-divider">================================</div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">
      {{ prefacturaDocumentLabel }}<span v-if="prefacturaDocNumber"> #{{ prefacturaDocNumber }}</span>
    </div>
    <div class="receipt-row receipt-small">{{ prefacturaDateTime }}</div>
    <div v-if="isKitchenServiceMode && posStore.activeTableSession?.tableName" class="receipt-row receipt-small">
      {{ tableSingular }} {{ prefacturaTableCode }} — {{ posStore.activeTableSession.tableName }}
    </div>
    <div v-else-if="posStore.activeTableSession?.isBar" class="receipt-row receipt-small">Barra</div>
    <div v-else class="receipt-row receipt-small">Mostrador</div>
    <div v-if="prefacturaWaiterName" class="receipt-row receipt-small">
      Mesero: {{ prefacturaWaiterName }}
    </div>
    <template v-if="selectedCustomer && !isAnonymousCustomer">
      <div class="receipt-divider receipt-small">--------------------------------</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">Datos cliente</div>
      <div class="receipt-row receipt-small">
        {{ selectedCustomer.fiscal_business_name || selectedCustomer.name || selectedCustomer.phone_number }}
      </div>
      <div v-if="selectedCustomer.fiscal_id" class="receipt-row receipt-small">
        {{ selectedCustomer.fiscal_id_type }}: {{ selectedCustomer.fiscal_id }}
      </div>
    </template>
    <div class="receipt-divider">--------------------------------</div>

    <div class="receipt-grid-header receipt-small">
      <span class="receipt-col-desc">Descripción</span>
      <span class="receipt-col-qty">Cant</span>
      <span class="receipt-col-price">Precio</span>
      <span class="receipt-col-total">Total</span>
    </div>
    <template v-for="item in cartItems" :key="item.id ?? item.orderItemId">
      <div class="receipt-grid-row receipt-small">
        <span class="receipt-col-desc">
          {{ item.product?.name || item.name }}<span v-if="isKitchenServiceMode && item.fired === false"> *</span>
        </span>
        <span class="receipt-col-qty">{{ item.quantity }}</span>
        <span class="receipt-col-price">{{ formatCurrency(getItemUnitPrice(item)) }}</span>
        <span class="receipt-col-total">{{ formatCurrency(getItemTotal(item)) }}</span>
      </div>
      <div
        v-for="mod in (item.modifiers ?? [])"
        :key="`${item.id ?? item.orderItemId}-${mod.id}`"
        class="receipt-grid-row receipt-small receipt-modifier-row"
      >
        <span class="receipt-col-desc">{{ formatModifierPrintDesc(mod) }}</span>
        <span class="receipt-col-qty">{{ (Number(mod.quantity) || 1) > 1 ? mod.quantity : '' }}</span>
        <span class="receipt-col-price">{{ formatCurrency(Number(mod.price) || 0) }}</span>
        <span class="receipt-col-total">{{ formatCurrency(getModifierLineTotal(mod)) }}</span>
      </div>
    </template>
    <div class="receipt-divider">--------------------------------</div>

    <div v-if="prefacturaPrintData.promoSavings > 0 || prefacturaPrintData.manualDiscountAmount > 0 || prefacturaPrintData.waroDiscountCop > 0" class="receipt-item">
      <span>Subtotal</span>
      <span>{{ formatCurrency(prefacturaPrintData.cartSubtotal) }}</span>
    </div>
    <div
      v-for="promo in prefacturaPrintData.promoBreakdown"
      :key="promo.promotion_id ?? promo.promotion_name"
      class="receipt-item"
    >
      <span>{{ promo.promotion_name }}</span>
      <span>-{{ formatCurrency(promo.savings) }}</span>
    </div>
    <div v-if="prefacturaPrintData.manualDiscountAmount > 0" class="receipt-item">
      <span>Descuento manual</span>
      <span>-{{ formatCurrency(prefacturaPrintData.manualDiscountAmount) }}</span>
    </div>
    <div v-if="prefacturaPrintData.waroDiscountCop > 0" class="receipt-item">
      <span>{{ prefacturaPrintData.waroRewardName ? `WaRo: ${prefacturaPrintData.waroRewardName}` : 'Canje WaRo' }}</span>
      <span>-{{ formatCurrency(prefacturaPrintData.waroDiscountCop) }}</span>
    </div>
    <div v-if="taxPreview && taxPreview.standard_tax > 0" class="receipt-item">
      <span>{{ taxPreview.standard_tax_label || 'Impuesto' }}</span>
      <span>{{ formatCurrency(taxPreview.standard_tax) }}</span>
    </div>
    <div v-if="taxPreview && taxPreview.liquor_tax > 0" class="receipt-item">
      <span>IVA licores 5%</span>
      <span>{{ formatCurrency(taxPreview.liquor_tax) }}</span>
    </div>
    <!-- warocol.com#739 + #939 — pre-bill totals include tip, advance, and split settlement when applicable -->
    <template v-if="prefacturaPrintData.tipAmount > 0 || prefacturaPrintData.advanceApplied > 0">
      <div class="receipt-item">
        <span>Total orden</span>
        <span>{{ formatCurrency(prefacturaPrintData.orderTotal) }}</span>
      </div>
      <div class="receipt-item">
        <span>{{ receiptTipLabel }}</span>
        <span>{{ formatCurrency(prefacturaPrintData.tipAmount) }}</span>
      </div>
      <div v-if="prefacturaPrintData.tipTaxAmount > 0" class="receipt-item">
        <span>{{ prefacturaPrintData.tipTaxLabel }}</span>
        <span>{{ formatCurrency(prefacturaPrintData.tipTaxAmount) }}</span>
      </div>
      <div v-if="prefacturaPrintData.advanceApplied > 0" class="receipt-item">
        <span>Anticipo mesa</span>
        <span>-{{ formatCurrency(prefacturaPrintData.advanceApplied) }}</span>
      </div>
      <div class="receipt-total">
        <span>TOTAL A COBRAR</span>
        <span>{{ formatCurrency(prefacturaPrintData.amountDue) }}</span>
      </div>
    </template>
    <div v-else class="receipt-total">
      <span>TOTAL</span>
      <span>{{ formatCurrency(prefacturaPrintData.orderTotal) }}</span>
    </div>
    <template v-if="prefacturaPrintData.splitPayments.length > 0">
      <div class="receipt-divider">--------------------------------</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">Pagos registrados</div>
      <div
        v-for="(p, idx) in prefacturaPrintData.splitPayments"
        :key="p.id"
        class="receipt-item receipt-small"
      >
        <span>#{{ idx + 1 }} · {{ p.payment_method_name }}</span>
        <span>{{ formatCurrency(p.amount) }}</span>
      </div>
      <div class="receipt-item">
        <span>{{ prefacturaPrintData.splitIsComplete ? 'Cobro completo' : 'Saldo pendiente' }}</span>
        <span>{{ formatCurrency(prefacturaPrintData.splitRemaining) }}</span>
      </div>
    </template>

    <div v-if="isKitchenServiceMode && cartItems.some(i => i.fired === false)" class="receipt-row receipt-small" style="margin-top:6px;">
      * pendiente de enviar a cocina
    </div>

    <div class="receipt-divider">================================</div>
    <!-- Issue #535 — Legal disclaimer: do NOT remove. -->
    <div class="receipt-footer receipt-small" style="font-weight:bold;">PREFACTURA — DOCUMENTO INFORMATIVO</div>
    <div class="receipt-footer receipt-small">No es comprobante fiscal ni factura electrónica DIAN</div>
  </div>

  <!-- Hidden receipt for printing — only visible via @media print -->
  <div id="pos-receipt" aria-hidden="true">
    <PosReceiptPrintHeader
      :fiscal-data="fiscalData"
      :display-name="businessProfile?.display_name"
      :address="businessProfile?.address"
      :city="businessProfile?.city"
      :phone="businessProfile?.phone_number"
      :logo-url="receiptLogoUrl"
    />
    <div class="receipt-divider">================================</div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">
      {{ receiptDocumentLabel }}<span v-if="(orderResult?.order_number ?? 0) > 0"> #{{ orderResult?.order_number }}</span>
    </div>
    <div v-if="receiptPrintContext?.soldAt" class="receipt-row receipt-small">{{ receiptPrintContext.soldAt }}</div>
    <div v-if="receiptPrintContext?.wasMesa && receiptPrintContext.tableName" class="receipt-row receipt-small">
      {{ tableSingular }} {{ receiptPrintContext.tableCode }} — {{ receiptPrintContext.tableName }}
    </div>
    <div v-else-if="receiptPrintContext?.isBar" class="receipt-row receipt-small">Barra</div>
    <div v-else-if="receiptPrintContext" class="receipt-row receipt-small">Mostrador</div>
    <div v-if="receiptPrintContext?.waiterName" class="receipt-row receipt-small">
      Mesero: {{ receiptPrintContext.waiterName }}
    </div>
    <template v-if="receiptPrintContext?.customerName">
      <div class="receipt-divider receipt-small">--------------------------------</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">Datos cliente</div>
      <div class="receipt-row receipt-small">{{ receiptPrintContext.customerName }}</div>
      <div v-if="receiptPrintContext.customerFiscalId" class="receipt-row receipt-small">
        {{ receiptPrintContext.customerFiscalIdType }}: {{ receiptPrintContext.customerFiscalId }}
      </div>
    </template>
    <div class="receipt-divider">--------------------------------</div>

    <div class="receipt-grid-header receipt-small">
      <span class="receipt-col-desc">Descripción</span>
      <span class="receipt-col-qty">Cant</span>
      <span class="receipt-col-price">Precio</span>
      <span class="receipt-col-total">Total</span>
    </div>
    <template v-for="item in cartItemsSnapshot" :key="item.id ?? item.orderItemId">
      <div class="receipt-grid-row receipt-small">
        <span class="receipt-col-desc">{{ item.product?.name || item.name }}</span>
        <span class="receipt-col-qty">{{ item.quantity }}</span>
        <span class="receipt-col-price">{{ formatCurrency(getItemUnitPrice(item)) }}</span>
        <span class="receipt-col-total">{{ formatCurrency(getItemTotal(item)) }}</span>
      </div>
      <div
        v-for="mod in (item.modifiers ?? [])"
        :key="`${item.id ?? item.orderItemId}-${mod.id}`"
        class="receipt-grid-row receipt-small receipt-modifier-row"
      >
        <span class="receipt-col-desc">{{ formatModifierPrintDesc(mod) }}</span>
        <span class="receipt-col-qty">{{ (Number(mod.quantity) || 1) > 1 ? mod.quantity : '' }}</span>
        <span class="receipt-col-price">{{ formatCurrency(Number(mod.price) || 0) }}</span>
        <span class="receipt-col-total">{{ formatCurrency(getModifierLineTotal(mod)) }}</span>
      </div>
    </template>
    <div class="receipt-divider">--------------------------------</div>

    <div
      v-if="orderResult && (orderResult.promo_savings || orderResult.discount_amount || orderResult.waro_discount_cop) && orderResult.subtotal"
      class="receipt-item"
    >
      <span>Subtotal</span>
      <span>{{ formatCurrency(orderResult.subtotal) }}</span>
    </div>
    <div
      v-for="promo in receiptPromoBreakdown"
      :key="promo.promotion_id ?? promo.promotion_name"
      class="receipt-item"
    >
      <span>{{ promo.promotion_name }}</span>
      <span>-{{ formatCurrency(promo.savings) }}</span>
    </div>
    <div v-if="orderResult?.discount_amount" class="receipt-item">
      <span>Descuento manual</span>
      <span>-{{ formatCurrency(orderResult.discount_amount) }}</span>
    </div>
    <div v-if="orderResultWaroDiscountCop > 0" class="receipt-item">
      <span>{{ orderResultWaroLineLabel }}</span>
      <span>-{{ formatCurrency(orderResultWaroDiscountCop) }}</span>
    </div>
    <template v-if="orderResult?.standard_tax && orderResult.standard_tax > 0 || orderResult?.liquor_tax && orderResult.liquor_tax > 0">
      <div class="receipt-row receipt-small" style="font-weight:bold;">Detalle de impuestos</div>
      <div v-if="orderResult?.standard_tax && orderResult.standard_tax > 0" class="receipt-item receipt-small">
        <span>{{ orderResult.standard_tax_label || 'Impuesto' }}</span>
        <span>{{ formatCurrency(orderResult.standard_tax) }}</span>
      </div>
      <div v-if="orderResult?.liquor_tax && orderResult.liquor_tax > 0" class="receipt-item receipt-small">
        <span>IVA licores 5%</span>
        <span>{{ formatCurrency(orderResult.liquor_tax) }}</span>
      </div>
    </template>
    <!-- warocol.com#739 — printed receipt mirrors success modal + split payments -->
    <template v-if="(orderResult?.tip_amount && orderResult.tip_amount > 0) || (orderResult?.advance_applied && orderResult.advance_applied > 0)">
      <div class="receipt-item">
        <span>Total orden</span>
        <span>{{ formatCurrency(orderResult?.total_amount ?? 0) }}</span>
      </div>
      <div v-if="orderResult?.tip_amount && orderResult.tip_amount > 0" class="receipt-item">
        <span>{{ receiptTipLabel }}</span>
        <span>{{ formatCurrency(orderResult.tip_amount) }}</span>
      </div>
      <div v-if="orderResult?.advance_applied && orderResult.advance_applied > 0" class="receipt-item">
        <span>Anticipo mesa</span>
        <span>-{{ formatCurrency(orderResult.advance_applied) }}</span>
      </div>
      <div class="receipt-total">
        <span>TOTAL COBRADO</span>
        <span>{{ formatCurrency(orderResultChargedAmount) }}</span>
      </div>
    </template>
    <div v-else class="receipt-total">
      <span>TOTAL</span>
      <span>{{ formatCurrency(orderResult?.total_amount ?? 0) }}</span>
    </div>
    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">Detalle de pago</div>
    <template v-if="splitPaymentsSnapshot.length > 0">
      <template v-for="(p, idx) in splitPaymentsSnapshot" :key="p.id">
        <div class="receipt-item receipt-small">
          <span>#{{ idx + 1 }} · {{ p.payment_method_name }}</span>
          <span>{{ formatCurrency(p.amount) }}</span>
        </div>
        <div v-if="p.change && p.change > 0" class="receipt-item receipt-small">
          <span>Cambio (#{{ idx + 1 }})</span>
          <span>{{ formatCurrency(p.change) }}</span>
        </div>
      </template>
    </template>
    <template v-else>
      <div class="receipt-item receipt-small">
        <span>{{
          orderResult?.payment_method
            ? (orderResult?.payment_method_name
                ? `${getPaymentMethodLabel(orderResult.payment_method)} · ${orderResult.payment_method_name}`
                : getPaymentMethodLabel(orderResult.payment_method))
            : 'Pendiente por definir'
        }}</span>
        <span>{{ formatCurrency(orderResultChargedAmount) }}</span>
      </div>
      <div
        v-if="receiptPrintContext?.singlePaymentChange && receiptPrintContext.singlePaymentChange > 0"
        class="receipt-item receipt-small"
      >
        <span>Cambio</span>
        <span>{{ formatCurrency(receiptPrintContext.singlePaymentChange) }}</span>
      </div>
    </template>
    <div class="receipt-divider">================================</div>
    <div class="receipt-footer">¡Gracias por tu compra!</div>
    <!-- DIAN invoice section on printed receipt -->
    <template v-if="invoiceResult">
      <div class="receipt-divider">================================</div>
      <div class="receipt-row" style="font-weight:bold;">FACTURA ELECTRÓNICA</div>
      <div class="receipt-row">{{ invoiceResult.prefix }}-{{ invoiceResult.invoice_number }}</div>
      <div v-if="invoiceResult.cufe" class="receipt-row receipt-small receipt-cufe">
        CUFE: {{ invoiceResult.cufe }}
      </div>
      <img
        v-if="invoiceQrDataUrl"
        :src="invoiceQrDataUrl"
        alt="QR verificación DIAN"
        class="receipt-qr"
      >
      <div v-if="invoiceResult.cufe" class="receipt-row receipt-small">Verificar en DIAN</div>
      <div class="receipt-divider">================================</div>
    </template>
  </div>

  <!-- Issue #537 — Estado de comandas (expediter) slide-over -->
  <PosComandasEstadoPanel
    v-if="expediterEnabled && comandasEnabled"
    v-model="showExpediterPanel"
    :table-session-id="posStore.activeTableSession?.tableId ?? null"
    :table-display-name="posStore.activeTableSession?.tableName ?? null"
  />

  <PosComandaPrintTickets
    v-if="comandasEnabled"
    :comandas="comandasForPrintDisplay"
    :business-name="posBusinessName"
  />
  </div>
</template>

<style scoped>
/* Ensure content doesn't get hidden behind fixed bottom bar */
.pb-32 {
  padding-bottom: 8rem;
}

/* Receipt + prefactura — hidden on screen, visible only when printing */
#pos-receipt,
#pos-prefactura {
  display: none;
}

/* Modifier/utility classes used by the receipt div */
.receipt-header { font-size: 1.1em; font-weight: bold; text-align: center; margin-bottom: 4px; }
.receipt-row { text-align: center; margin: 2px 0; }
.receipt-divider { letter-spacing: 0; margin: 4px 0; }
.receipt-item { display: flex; justify-content: space-between; margin: 2px 0; gap: 4px; }
.receipt-item span:first-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.receipt-item span:last-child { white-space: nowrap; flex-shrink: 0; }
.receipt-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; margin: 4px 0; }
.receipt-qr { width: 30mm; height: 30mm; margin: 4px auto; display: block; }
.receipt-cufe { word-break: break-all; text-align: center; }
.receipt-footer { text-align: center; margin-top: 8px; }
.receipt-small { font-size: 0.85em; }
.receipt-grid-header,
.receipt-grid-row {
  display: grid;
  grid-template-columns: 1fr 7mm 15mm 16mm;
  gap: 0.6mm;
  align-items: start;
  margin: 2px 0;
}
.receipt-col-desc { min-width: 0; overflow-wrap: anywhere; white-space: normal; }
.receipt-col-qty,
.receipt-col-price,
.receipt-col-total { text-align: right; white-space: nowrap; }
.receipt-grid-header { font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 2px; margin-bottom: 4px; }
.receipt-modifier-row .receipt-col-desc { padding-left: 8px; font-size: 0.92em; }
</style>

<style>
@media print {
  /* Reset browser default margins */
  body {
    margin: 0;
    padding: 0;
  }

  /* Hide everything, then reveal only the receipt (default — post-payment). */
  body * { visibility: hidden; }
  #pos-receipt,
  #pos-receipt * { visibility: visible; }

  /* Issue #535 — when body has .printing-prefactura class, swap which
     printable div is visible. The receipt path stays the default. */
  body.printing-prefactura #pos-receipt,
  body.printing-prefactura #pos-receipt * { visibility: hidden !important; }
  body.printing-prefactura #pos-prefactura,
  body.printing-prefactura #pos-prefactura * { visibility: visible !important; }

  #pos-receipt,
  #pos-prefactura {
    display: block !important;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9.5pt;
    line-height: 1.2;
    letter-spacing: 0;
    width: 64mm;
    color: #000;
    background: #fff;
    box-sizing: border-box;
    padding: 0 1.5mm 14mm;
    position: absolute;
    top: 0;
    left: 0;
  }

  /* Hide each by default; the body class toggles which is shown. */
  #pos-prefactura { display: none !important; }
  body.printing-prefactura #pos-receipt { display: none !important; }
  body.printing-prefactura #pos-prefactura { display: block !important; }

  #pos-receipt .receipt-logo,
  #pos-prefactura .receipt-logo {
    filter: grayscale(100%) !important;
    -webkit-filter: grayscale(100%) !important;
  }

  /* Prevent item rows from splitting across pages */
  .receipt-item {
    page-break-inside: avoid;
  }

  @page {
    size: 80mm auto;
    margin: 0;
  }
}
</style>
