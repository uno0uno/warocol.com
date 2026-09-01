<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
const {
  checkoutSectionCardClass,
  checkoutSectionCardFlushClass,
  checkoutSectionTitleClass,
  checkoutControlHeightClass,
  checkoutAccordionTriggerClass,
  checkoutStatGridClass,
  checkoutStatCardClass,
  checkoutInlineRowClass,
  checkoutAlertBannerClass,
} = usePosToolbarControl()
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
import { normalizeFiscalDocumentId } from '~/utils/fiscalDocument'
import { posDebugLog, posDebugSerializeError } from '~/utils/posDebugLog'
import { buildReceiptTicketItems, consolidateReceiptPrintLines } from '~/utils/receiptPrintLines'
import {
  formatReceiptModifierBlock,
  formatReceiptProductBlock,
  formatReceiptTaxBulletLine,
  formatReceiptTaxCue,
  joinReceiptParts,
  padReceiptLine,
  receiptDivider,
  receiptItemSeparator,
  receiptSectionSeparator,
  collectThermalTicketText,
  compactThermalMoneyLabel,
  type ReceiptDeliveryFields,
} from '~/utils/receiptTicketPlainText'
import { resolveReceiptLogoUrl } from '~/utils/receiptPrintConfig'
import { notifyCajaPrintResult, useCajaTicketPrint } from '~/composables/useCajaTicketPrint'
import { modifierLineTotal } from '~/utils/saleModifierOption'
import {
  buildCustomerIdentityPresentation,
  formatFiscalIdentityLabel,
  type InvoiceAcquirerSource,
} from '~/utils/customerIdentityPresentation'
import { isWompiPaymentMethod } from '~/utils/wompiCollections'
import { subscribeOrderPaymentApproved } from '~/composables/useNotifications'
import WompiCollectionSlideover from '~/components/pos/WompiCollectionSlideover.vue'

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

useHead({ title: () => t('pos.checkout.title') })

const router = useRouter()
const route = useRoute()
const posStore = usePOSStore()
const cache = useQueryCache()
const toast = useToast()
const { currentTenant, businessProfile } = useTenantReactive()
const { printElement: printTicketElement, getCachedCajaPrinterName } = useCajaTicketPrint()

/** POS-scoped tenant display/settings — available to cashier via restaurant-context. */
const posCheckoutContext = computed(() => settingsData.value?.data ?? null)
const posCheckoutBusiness = computed(() => {
  const ctx = posCheckoutContext.value
  const profile = businessProfile.value
  const fiscal = ctx?.fiscal_data
  return {
    display_name: ctx?.display_name ?? profile?.display_name ?? null,
    address: fiscal?.fiscal_address ?? profile?.address ?? null,
    city: fiscal?.city ?? profile?.city ?? null,
    phone_number: fiscal?.phone ?? profile?.phone_number ?? null,
    auto_select_generic_enabled:
      ctx?.auto_select_generic_enabled ?? profile?.auto_select_generic_enabled ?? false,
  }
})
const { timezone } = useTenantTimezone()
const { singular: tableSingular } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())
const uiLocale = computed(() => toNumberLocaleTag(locale.value))

const isGenericTaxLabel = (label?: string | null) => {
  const normalized = String(label ?? '').trim().toLocaleLowerCase('es-CO')
  return !normalized || normalized === 'impuesto' || normalized === 'tax'
}

const localizedInternalTaxLabel = (label?: string | null) => {
  const raw = String(label ?? '').trim()
  if (isGenericTaxLabel(raw)) return t('pos.checkout.taxFallback')
  return raw
}

function formatTenantDateTime(date = new Date()) {
  return date.toLocaleString(uiLocale.value, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: timezone.value,
  })
}

function formatOptionalTenantDateTime(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return formatTenantDateTime(date)
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
  liquor_tax_label?: string
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
/** Last address that received a receipt/invoice email (form stays open for another). */
const lastSentEmail = ref('')
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
  customerPhone: string | null
  customerEmail: string | null
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
// matias_dian: DIAN chrome (#1892) + auto-email after FE emit (#1893). Not invoicing_ready.
const { isMatiasDian } = useTenantFinancialProfile()

// Invoice state
const invoiceLoading = ref(false)
const invoiceResult = ref<{
  cufe: string
  invoice_number: number
  prefix: string
  pdf_presigned_url: string | null
  status: string
  emitted_at?: string | null
  created_at?: string | null
  presentation?: { acquirer?: InvoiceAcquirerSource | null } | null
} | null>(null)
const invoiceError = ref('')
const invoiceQrDataUrl = ref('')
const invoiceProgress = ref('')
const invoiceResults = ref<{ order_id: string; prefix: string; invoice_number: number; cufe: string; status: string; error?: string }[]>([])
const hasGeneratedInvoice = computed(() =>
  invoiceResult.value?.status === 'accepted'
  && Boolean(invoiceResult.value.prefix)
  && Boolean(invoiceResult.value.invoice_number),
)

const extractInvoiceFetchError = (e: any) =>
  e?.data?.detail || e?.data?.message || e?.message || t('pos.checkout.invoice.generateError')

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

type PosCustomerSource = {
  id: string
  name?: string | null
  phone_number?: string | null
  phone?: string | null
  email?: string | null
  fiscal_id_type?: FiscalIdType | string | null
  fiscal_id?: string | null
  fiscal_business_name?: string | null
  fiscal_email?: string | null
}

function toPosCustomer(source: PosCustomerSource): PosCustomer {
  return {
    id: source.id,
    name: source.name ?? null,
    phone_number: source.phone_number ?? source.phone ?? null,
    email: source.email ?? null,
    fiscal_id_type: (source.fiscal_id_type as FiscalIdType | null | undefined) ?? null,
    fiscal_id: source.fiscal_id ?? null,
    fiscal_business_name: source.fiscal_business_name ?? null,
    fiscal_email: source.fiscal_email ?? null,
  }
}

async function hydrateCustomerFiscalIfMissing(customer: PosCustomer): Promise<PosCustomer> {
  if (!customer.id || customer.fiscal_id || customer.phone_number === '0000000000') {
    return customer
  }
  try {
    const res = await $fetch<{ success: boolean; data: PosCustomer }>(
      `/api/pos/customers/${customer.id}`,
    )
    if (res.success && res.data) {
      return { ...customer, ...res.data }
    }
  } catch {
    // Fall through — wizard will collect fiscal data if still missing.
  }
  return customer
}
const selectedCustomer = ref<PosCustomer | null>(null)
const showWompiSlideover = ref(false)
const wompiOrderId = ref<string | null>(null)
const wompiAmount = ref(0)
const wompiWasKitchen = ref(false)
let unsubscribeWompiPayment: (() => void) | null = null
const selectedCustomerIdentity = computed(() =>
  buildCustomerIdentityPresentation(selectedCustomer.value),
)

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
    && normalizeFiscalDocumentId(fiscalWizardForm.value.fiscal_id)
    && fiscalWizardForm.value.fiscal_business_name.trim(),
))

// Customer insights
const customerInsights = ref<CustomerInsights | null>(null)
const insightsLoading = ref(false)
// Accordions start closed; the user opens them on demand. Previous behavior
// auto-opened "summary" / "insights" on customer change — too noisy.
const activeAccordion = ref<'order' | 'insights' | 'summary' | 'waros' | null>(null)

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
  liquor_tax_label?: string
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
  tax_amount?: number
  tax_label?: string | null
  tax_rate?: number | null
  tax_category?: string | null
  tax_resolution?: string | null
  included_in_price?: boolean | null
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
  return t('pos.receipt.tipTax')
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
  if (isPendingDeliveryMode.value) return false
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

const pendingOrderId = computed(() => {
  const q = route.query.pendingOrder
  return typeof q === 'string' && q.length > 0 ? q : null
})
const isPendingDeliveryMode = computed(() => !!pendingOrderId.value)

type PendingDeliveryDetail = {
  id: string
  order_number: number
  total_amount: number
  status: string
  payment_status?: string | null
  discount_amount?: number
  promo_savings?: number
  promo_breakdown?: PromoBreakdownLine[]
  standard_tax?: number
  liquor_tax?: number
  standard_tax_label?: string
  liquor_tax_label?: string
  delivery_address_id?: string | null
  delivery_instructions?: string | null
  customer?: { id?: string | null; name?: string | null; phone?: string | null; phone_number?: string | null; email?: string | null }
  items?: Array<{
    id: string
    quantity: number
    price_at_purchase: number
    subtotal: number
    promo_savings_allocated?: number
    promotion_name?: string | null
    promotion_type?: string | null
    tax_category?: string | null
    product?: { id?: string | null; name?: string | null }
    modifiers?: Array<{ name: string; price: number; quantity?: number }>
  }>
  partial_payments?: Array<{
    id: string
    amount: number
    payment_method: string
    payment_method_id?: string | null
    payment_method_name?: string | null
  }>
  delivery_address?: {
    address_line1?: string | null
    address_line2?: string | null
    city?: string | null
  } | null
  address_label?: string | null
}

const {
  data: pendingDeliveryPayload,
  status: pendingDeliveryStatus,
  error: pendingDeliveryError,
} = useQuery({
  key: () => ['tables', 'pending-deliveries', pendingOrderId.value],
  query: () => $fetch<{ success: boolean; data: PendingDeliveryDetail }>(
    `/api/tables/pending-deliveries/${pendingOrderId.value}`,
  ),
  enabled: () => !!pendingOrderId.value,
  staleTime: 0,
})
const pendingDeliveryOrder = computed(() => pendingDeliveryPayload.value?.data ?? null)
const pendingDeliveryAddressLabel = computed(() => {
  const order = pendingDeliveryOrder.value
  if (!order) return null
  if (order.address_label?.trim()) return order.address_label.trim()
  const addr = order.delivery_address
  if (!addr) return null
  return [addr.address_line1, addr.address_line2, addr.city].filter(Boolean).join(', ') || null
})

const mapPendingDeliveryItemToCheckoutLine = (item: NonNullable<PendingDeliveryDetail['items']>[number]) => ({
  orderItemId: item.id,
  promotionName: item.promotion_name ?? null,
  promoType: item.promotion_type ?? null,
  promoSavings: Number(item.promo_savings_allocated) || 0,
  promoOptOut: false,
  tax_category: item.tax_category ?? null,
  product: {
    id: item.product?.id ?? '',
    name: item.product?.name ?? '',
    price: item.price_at_purchase,
    image: '🍽️',
    category: '',
    tax_category: item.tax_category ?? null,
  },
  modifiers: item.modifiers ?? [],
  quantity: item.quantity,
  notes: undefined,
  subtotal: Number(item.subtotal) || 0,
})

const mapTabItemToCheckoutLine = (item: (typeof storeTabItems.value)[number]) => {
  const raw = item as any
  return {
    orderItemId: item.orderItemId,
    promotionName: item.promotionName ?? raw.promotion_name ?? raw.locked_promotion_name ?? null,
    promoType: item.promoType ?? raw.promo_type ?? raw.locked_promo_type ?? null,
    promoSavings: Number(item.promoSavings ?? raw.promo_savings ?? raw.locked_promo_savings) || 0,
    promoOptOut: Boolean(item.promoOptOut ?? raw.promo_opt_out),
    tax_category: item.taxCategory ?? raw.tax_category ?? null,
    tax_label: item.taxLabel ?? raw.tax_label ?? null,
    tax_amount: item.taxAmount ?? raw.tax_amount ?? null,
    included_in_price: item.includedInPrice ?? raw.included_in_price ?? null,
    product: {
      id: item.productId,
      name: item.productName,
      price: item.unitPrice,
      image: '🍽️',
      category: '',
      tax_category: item.taxCategory ?? raw.tax_category ?? null,
    },
    modifiers: item.modifiers ?? [],
    quantity: item.quantity,
    notes: item.notes ?? undefined,
  }
}

// Computed (must be before any watchers that reference cartTotal)
const cartItems = computed(() => {
  if (isPendingDeliveryMode.value) {
    return (pendingDeliveryOrder.value?.items ?? []).map(mapPendingDeliveryItemToCheckoutLine)
  }
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
const showKitchenSendOnChargeBanner = computed(
  () =>
    comandasEnabled.value
    && isCounterMode.value
    && cartItems.value.length > 0
    && !isPendingDeliveryMode.value,
)
const hasOrderLines = computed(
  () =>
    cartItems.value.length > 0
    || (!!posStore.activeTableSession && storeTabItems.value.length > 0),
)
const showEmptyCheckout = computed(
  () =>
    !showSuccessModal.value
    && !isKitchenServiceMode.value
    && !isPendingDeliveryMode.value
    && !hasOrderLines.value,
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
const pendingDeliveryGrossSubtotal = computed(() =>
  cartItems.value.reduce((sum, item) => {
    const line = item as { subtotal?: number; product?: { price?: number }; quantity?: number }
    return sum + (Number(line.subtotal) || (Number(line.product?.price) || 0) * (Number(line.quantity) || 0))
  }, 0),
)
const persistedPendingOrderDiscount = computed(() => {
  if (!isPendingDeliveryMode.value || discountEnabled.value) return 0
  return Number(pendingDeliveryOrder.value?.discount_amount) || 0
})
const cartTotal = computed(() => {
  if (isPendingDeliveryMode.value) {
    const gross = pendingDeliveryGrossSubtotal.value
    if (gross > 0) return gross
    const total = Number(pendingDeliveryOrder.value?.total_amount)
    if (Number.isFinite(total) && total > 0) return total
    return 0
  }
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
  if (isPendingDeliveryMode.value) {
    const order = pendingDeliveryOrder.value
    if (!order) return null
    const gross = pendingDeliveryGrossSubtotal.value
    const savings = Number(order.promo_savings) || 0
    return {
      subtotal: gross,
      promo_savings: savings,
      subtotal_after_promos: savings > 0 ? Math.max(0, gross - savings) : gross,
      promo_breakdown: order.promo_breakdown ?? [],
      lines: [],
    }
  }
  if (isKitchenServiceMode.value) {
    const session = mesaCurrentData.value?.data?.session
    if (!session) return null
    return {
      subtotal: cartTotal.value,
      promo_savings: Number(session.promo_savings) || 0,
      subtotal_after_promos: Number(session.subtotal_after_promos ?? session.running_total) || 0,
      promo_breakdown: session.promo_breakdown ?? [],
      // Mesa /current now annotates per-line tax (same shape as cart tax-preview)
      lines: session.lines ?? session.promo_lines ?? [],
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
  modifiers?: Array<{ id: string; price: number; quantity?: number; included_quantity?: number }>
  quantity: number
  orderItemId?: string
}

function checkoutLineGross(item: CheckoutPromoLineItem): number {
  if (isKitchenServiceMode.value) {
    const tab = storeTabItems.value.find(t => t.orderItemId === item.orderItemId)
    if (tab) return tab.subtotal
  }
  const base = Number(item.product.price) || 0
  const mods = (item.modifiers ?? []).reduce((sum, mod) => sum + modifierLineTotal(mod), 0)
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
  const name = activePromoHint.value || t('pos.receipt.promoFallback')
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
    : [{ promotion_name: t('pos.receipt.promoFallback'), promo_type: '', savings }]
  return {
    promo_savings: savings,
    promo_breakdown: breakdown,
    subtotal: Number(data?.subtotal) || fallbackSubtotal,
  }
}

function orderDiscountFieldsFromCheckout(
  data: { discount_amount?: number; subtotal?: number | null } | null | undefined,
  fallbackSubtotal: number,
) {
  if (discountEnabled.value && discountAmount.value > 0) {
    return { discount_amount: discountAmount.value, subtotal: fallbackSubtotal }
  }
  const fromApi = Number(data?.discount_amount) || 0
  if (fromApi > 0) {
    return {
      discount_amount: fromApi,
      subtotal: Number(data?.subtotal) || fallbackSubtotal,
    }
  }
  return {}
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
    return t('pos.checkout.discount.greaterThanZero')
  }
  if (discountType.value === 'percent') {
    if (val > 100) return t('pos.checkout.discount.percentMax')
    return ''
  }
  const maxFixedDiscount = Math.round(subtotalAfterPromos.value)
  if (maxFixedDiscount <= 0) {
    return t('pos.checkout.discount.noSubtotal')
  }
  if (Math.round(val) > maxFixedDiscount) {
    return t('pos.checkout.discount.fixedMax', { amount: formatCurrency(maxFixedDiscount) })
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
  Math.max(
    0,
    subtotalAfterPromos.value
      - discountAmount.value
      - persistedPendingOrderDiscount.value
      - waroDiscountCop.value,
  ),
)
// warocol.com#639 — final amount charged to the customer when tipping is enabled.
// total_amount on orders never includes tip (tax-base invariant from migration 079);
// charged_amount = total_amount + additive tax + tip (see additiveTaxTotal after taxPreview).
const finalChargedAmount = computed(() =>
  discountedTotal.value
  + additiveTaxTotal.value
  + tipSettlementTotal(tipAmount.value, tipTaxAmount.value),
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
      liquor_tax_label?: string
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
  if (isPendingDeliveryMode.value) {
    const order = pendingDeliveryOrder.value as (PendingDeliveryDetail & {
      standard_tax?: number
      liquor_tax?: number
      standard_tax_label?: string
      liquor_tax_label?: string
    }) | null
    if (!order) return null
    return {
      standard_tax: Number(order.standard_tax) || 0,
      liquor_tax: Number(order.liquor_tax) || 0,
      standard_tax_label: localizedInternalTaxLabel(order.standard_tax_label),
      liquor_tax_label: localizedInternalTaxLabel(order.liquor_tax_label),
    }
  }
  if (isKitchenServiceMode.value) {
    const session = mesaCurrentData.value?.data?.session
    if (!session) return null
    return {
      standard_tax: Number(session.standard_tax) || 0,
      liquor_tax: Number(session.liquor_tax) || 0,
      standard_tax_label: localizedInternalTaxLabel(session.standard_tax_label),
      liquor_tax_label: localizedInternalTaxLabel(session.liquor_tax_label),
    }
  }
  const data = posTaxPreviewData.value
  if (!data) return null
  return {
    standard_tax: Number(data.standard_tax) || 0,
    liquor_tax: Number(data.liquor_tax) || 0,
    standard_tax_label: localizedInternalTaxLabel(data.standard_tax_label),
    liquor_tax_label: localizedInternalTaxLabel(data.liquor_tax_label),
  }
})

/** Exclusive tax added on top of product prices (MX IVA); omitted when included_in_price (CO INC). */
const additiveTaxTotal = computed(() =>
  additiveOrderTaxTotal(
    taxPreview.value?.standard_tax ?? 0,
    taxPreview.value?.liquor_tax ?? 0,
    tenantTaxConfig.value as Record<string, unknown> | null,
  ),
)

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
    taxCategory: i.taxCategory ?? i.tax_category ?? null,
    taxLabel: i.taxLabel ?? i.tax_label ?? null,
    taxAmount: i.taxAmount != null || i.tax_amount != null
      ? Number(i.taxAmount ?? i.tax_amount) || 0
      : null,
    includedInPrice: i.includedInPrice ?? i.included_in_price ?? null,
    modifiers: (i.modifiers ?? []).map((m: any) => ({
      id: m.id ?? '',
      name: m.name,
      price: Number(m.price) || 0,
      quantity: Number(m.quantity) || 1,
      included_quantity: Math.max(0, Number(m.included_quantity) || 0),
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
  discountedTotal.value
  + additiveTaxTotal.value
  + tipSettlementTotal(tipAmount.value, tipTaxAmount.value),
)
const splitRemaining = computed(() => Math.max(0, splitAmountDue.value - splitPaidTotal.value))
const splitIsComplete = computed(() => splitRemaining.value <= 0.01)

const onSplitAmountInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const raw = Number(input.value.replace(/\./g, '').replace(/\D/g, ''))
  splitPartialAmount.value = raw || null
  cashReceivedInput.value = 0
  input.value = raw ? raw.toLocaleString(uiLocale.value) : ''
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
  if (amount <= 0) return t('pos.checkout.split.amountGreaterThanZero')
  if (amount - splitRemaining.value > 0.01) {
    return t('pos.checkout.split.amountExceedsPending', { amount: formatCurrency(splitRemaining.value) })
  }
  return ''
})

const splitPaymentValidationMessage = computed(
  () => splitAmountValidationMessage.value,
)

const canAddSplitPayment = computed(
  () =>
    !isAddingPayment.value
    && !!selectedPaymentMethod.value
    && !requiresMethodSelection.value
    && !!splitAmountToCharge.value
    && splitAmountToCharge.value > 0
    && !!selectedCustomer.value
    && (isKitchenServiceMode.value || !!posStore.cartId || isPendingDeliveryMode.value)
    && cashIsValid.value
    && manualDiscountIsValid.value
    && !walletTenderValidationMessage.value
    && !splitPaymentValidationMessage.value,
)

const splitAmountToCharge = computed(() =>
  splitPartialAmount.value !== null
  && splitPartialAmount.value > 0
  && !splitAmountValidationMessage.value
    ? splitPartialAmount.value
    : 0
)

function openSplitSuccessModal(completeData: Record<string, any>) {
  captureReceiptPrintContext()
  orderResult.value = {
    order_id: completeData.order_id,
    order_ids: completeData.order_ids,
    order_number: Number(completeData.order_number) || 0,
    order_numbers: completeData.order_numbers,
    total_amount: Number(completeData.total_amount ?? discountedTotal.value),
    payment_method: completeData.payment_method ?? selectedPaymentMethod.value,
    status: completeData.status ?? 'completed',
    payment_status: completeData.payment_status ?? 'paid',
    ...promoFieldsForReceipt(cartTotal.value),
    ...(discountEnabled.value && discountAmount.value > 0
      ? { discount_amount: discountAmount.value, subtotal: cartTotal.value }
      : {}),
    standard_tax: Number(completeData.standard_tax ?? taxPreview.value?.standard_tax ?? 0),
    liquor_tax: Number(completeData.liquor_tax ?? taxPreview.value?.liquor_tax ?? 0),
    standard_tax_label: localizedInternalTaxLabel(completeData.standard_tax_label ?? taxPreview.value?.standard_tax_label),
    liquor_tax_label: localizedInternalTaxLabel(completeData.liquor_tax_label ?? taxPreview.value?.liquor_tax_label),
    ...(tipAmount.value > 0
      ? {
          tip_amount: Number(completeData.tip_amount ?? tipAmount.value),
          charged_amount: Number(completeData.charged_amount ?? splitAmountDue.value),
        }
      : {}),
    ...waroOrderResultFields(completeData.waro_redemption_summary, cartTotal.value),
  }
  cartItemsSnapshot.value = snapshotCartItemsForReceipt()
  // Same email prep as normal/mesa success — required for FE auto-send (#2025)
  applyReceiptEmailAfterSale(selectedCustomer.value)
  splitMode.value = false
  posStore.clearAll()
  showSuccessModal.value = true
  document.body.classList.remove('printing-prefactura')
  prefacturaPrintSnapshot.value = null
}

function finalizePendingDeliverySuccess(
  data: Record<string, any>,
  opts?: { paymentMethod?: string; paymentMethodName?: string | null },
) {
  const promoSource = {
    promo_savings: data.promo_savings ?? pendingDeliveryOrder.value?.promo_savings,
    promo_breakdown: data.promo_breakdown ?? pendingDeliveryOrder.value?.promo_breakdown,
    subtotal: data.subtotal,
  }
  orderResult.value = {
    order_id: data.order_id ?? pendingOrderId.value,
    order_number: Number(data.order_number ?? pendingDeliveryOrder.value?.order_number ?? 0),
    total_amount: Number(data.total_amount ?? pendingDeliveryOrder.value?.total_amount ?? discountedTotal.value),
    payment_method: data.payment_method ?? opts?.paymentMethod ?? selectedPaymentMethod.value,
    payment_method_name: opts?.paymentMethodName ?? undefined,
    status: 'completed',
    payment_status: data.payment_status ?? 'paid',
    customer_id: selectedCustomer.value?.id,
    standard_tax: Number(data.standard_tax ?? taxPreview.value?.standard_tax ?? 0),
    liquor_tax: Number(data.liquor_tax ?? taxPreview.value?.liquor_tax ?? 0),
    standard_tax_label: localizedInternalTaxLabel(data.standard_tax_label ?? taxPreview.value?.standard_tax_label),
    liquor_tax_label: localizedInternalTaxLabel(data.liquor_tax_label ?? taxPreview.value?.liquor_tax_label),
    ...promoFieldsFromCloseResponse(promoSource, cartTotal.value),
    ...orderDiscountFieldsFromCheckout(
      {
        ...data,
        discount_amount: data.discount_amount ?? pendingDeliveryOrder.value?.discount_amount,
      },
      cartTotal.value,
    ),
  }
  wasMesaMode.value = false
  cartItemsSnapshot.value = snapshotCartItemsForReceipt()
  captureReceiptPrintContext()
  applyReceiptEmailAfterSale(selectedCustomer.value)
  receiptEmail.value = ''
  emailSent.value = false
  lastSentEmail.value = ''
  emailFromProfile.value = false
  posStore.exitSession()
  cache.invalidateQueries({ key: ['tables', currentTenant.value?.id ?? null] })
  cache.invalidateQueries({ key: ['tables', 'pending-deliveries'] })
  splitMode.value = false
  showSuccessModal.value = true
  document.body.classList.remove('printing-prefactura')
  prefacturaPrintSnapshot.value = null
}

const addSplitPayment = async () => {
  if (
    !isKitchenServiceMode.value
    && !posStore.cartId
    && !isPendingDeliveryMode.value
  ) {
    processingError.value = t('pos.checkout.split.selectMethodAndCustomer')
    return
  }
  if (!selectedPaymentMethod.value || !selectedCustomer.value) {
    processingError.value = t('pos.checkout.split.selectMethodAndCustomer')
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
  if (isWompiTender.value) {
    processingError.value = 'Wompi no admite cobro dividido. Cobra el total con Wompi.'
    return
  }
  const amountToCharge = splitAmountToCharge.value
  if (amountToCharge <= 0) {
    processingError.value = t('pos.checkout.split.enterAmount')
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
    let lastPaymentData: Record<string, any> | null = null

    if (isPendingDeliveryMode.value && pendingOrderId.value) {
      const _discountAmtPending = discountAmount.value
      if (splitPayments.value.length === 0) {
        const response = await $fetch(`/api/tables/pending-deliveries/${pendingOrderId.value}/complete`, {
          method: 'POST',
          body: {
            payment_method: selectedPaymentMethod.value,
            customer_id: selectedCustomer.value.id,
            payment_method_id: selectedPaymentMethodId.value ?? null,
            split_mode: true,
            split_first_amount: amountToCharge,
            ...(isCashMethod.value
              ? { split_first_cash_received: Number(cashReceivedInput.value) }
              : {}),
            ...(discountEnabled.value && _discountAmtPending > 0
              ? { discount_type: discountType.value, discount_value: Number(discountInput.value) }
              : {}),
            ...checkoutServedByBody.value,
            ...checkoutTipBody.value,
            ...checkoutWaroBody.value,
          },
        }) as any
        paidTotal = response.data.paid_total ?? amountToCharge
        remaining = response.data.remaining ?? (splitAmountDue.value - amountToCharge)
        isComplete = response.data.is_complete ?? false
        lastPaymentData = response.data
        paymentId = response.data.payment_id
      } else {
        const response = await $fetch(`/api/tables/pending-deliveries/${pendingOrderId.value}/payments`, {
          method: 'POST',
          body: {
            amount: amountToCharge,
            payment_method: selectedPaymentMethod.value,
            payment_method_id: selectedPaymentMethodId.value ?? undefined,
            ...(isCashMethod.value
              ? { cash_received: Number(cashReceivedInput.value) }
              : {}),
          },
        }) as any
        paidTotal = response.data.paid_total
        remaining = response.data.remaining
        isComplete = response.data.is_complete
        lastPaymentData = response.data
        paymentId = response.data.payment_id
      }
    } else if (isKitchenServiceMode.value) {
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
        lastPaymentData = response.data
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
        lastPaymentData = response.data
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
        lastPaymentData = response.data
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
        lastPaymentData = response.data
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
    if (isPendingDeliveryMode.value) {
      cache.invalidateQueries({ key: ['tables', 'pending-deliveries', pendingOrderId.value] })
    }

    if (isComplete || splitRemaining.value <= 0.01) {
      if (isPendingDeliveryMode.value) {
        const subMethodName = selectedPaymentMethodId.value
          ? selectedGroup.value?.methods.find(m => m.id === selectedPaymentMethodId.value)?.name
          : undefined
        finalizePendingDeliverySuccess(lastPaymentData ?? {}, {
          paymentMethod: selectedPaymentMethod.value,
          paymentMethodName: subMethodName ?? null,
        })
      } else {
        openSplitSuccessModal(lastPaymentData ?? {})
      }
    }
  } catch (e: any) {
    processingError.value = checkoutErrorMessage(e, t('pos.checkout.split.partialPaymentError'))
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
    const endpoint = isPendingDeliveryMode.value && pendingOrderId.value
      ? `/api/tables/pending-deliveries/${pendingOrderId.value}/payments/${p.id}`
      : isKitchenServiceMode.value
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
    if (isPendingDeliveryMode.value) {
      cache.invalidateQueries({ key: ['tables', 'pending-deliveries', pendingOrderId.value] })
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
    voidPaymentError.value = beMessage || t('pos.checkout.split.deletePaymentError')
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

/** Usable receipt email: real address only (ignore walk-in @customer.temp). */
function usableReceiptEmail(customer: { email?: string | null } | null | undefined): string {
  const email = (customer?.email ?? '').trim()
  if (!email || email.toLowerCase().endsWith('@customer.temp')) return ''
  return email
}

/**
 * Prefill Venta Completada email from the selected customer (#1893 / #2025).
 * Prefer a usable email even when phone is the Genérico placeholder `0000000000`
 * (cashier selected Genérico but filled a real email, or profile was updated).
 */
function applyReceiptEmailAfterSale(customer: { phone_number?: string | null; email?: string | null } | null | undefined) {
  emailSent.value = false
  lastSentEmail.value = ''
  const usable = usableReceiptEmail(customer)
  receiptEmail.value = usable
  emailFromProfile.value = !!usable
}

const selectedCustomerDisplayName = computed(() =>
  isAnonymousCustomer.value
    ? t('pos.checkout.customerNoData')
    : selectedCustomer.value?.name || t('pos.checkout.customerNoData'),
)
const walletCustomerIdRef = computed(() => {
  const customer = selectedCustomer.value
  if (!customer || customer.phone_number === '0000000000') return ''
  return customer.id
})
const { wallet: customerWallet, isLoading: isLoadingWallet, isRefreshing: isRefreshingWallet, refetch: refetchWallet } =
  useCustomerWallet(walletCustomerIdRef, { scope: 'pos' })
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
    return `${reward.waros_cost.toLocaleString(uiLocale.value)} ${t('pos.wallet.pointsShort')} · ${formatCurrency(reward.fixed_cop_off)}`
  }
  return `${reward.waros_cost.toLocaleString(uiLocale.value)} ${t('pos.wallet.pointsShort')}`
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
const isDeliveryEligible = computed(() => {
  const identified = !!selectedCustomer.value && !isAnonymousCustomer.value
  if (isPendingDeliveryMode.value) return identified
  return canRegisterDelivery.value && acceptsOnlineOrders.value && identified
})

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
  if (isPendingDeliveryMode.value) return
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
      err?.data?.detail || err?.data?.message || err?.message || t('pos.checkout.deliveryCheckout.saveAddressError')
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
      const res = await $fetch<{ data: CustomerInsights }>(`/api/pos/customers/${customer.id}/insights`)
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

// Methods — display currency from tenant prefs (default COP); see display-currency.md
const { formatCurrency, formatCurrencyThermal, currencyCode } = useFormatters()

const getItemTotal = (item: any) => {
  const basePrice = Number(item.product.price) || 0
  const modifiersPrice = item.modifiers.reduce(
    (sum: number, mod: any) => sum + modifierLineTotal(mod),
    0,
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

const resolveLineTaxLabel = (
  preview: PromoPreviewLine | undefined,
  category: string,
  item?: any,
): string => {
  const raw = String(preview?.tax_label ?? item?.tax_label ?? item?.taxLabel ?? '').trim()
  if (!isGenericTaxLabel(raw)) return raw
  if (category === 'exempt') return t('pos.cartItem.taxExempt')
  if (category === 'liquor') {
    const liq = taxPreview.value?.liquor_tax_label
    if (!isGenericTaxLabel(liq)) return String(liq)
    return t('pos.receipt.liquorVat')
  }
  if (category === 'standard') {
    const std = taxPreview.value?.standard_tax_label
    if (!isGenericTaxLabel(std)) return String(std)
  }
  return ''
}

const getLineTaxInfo = (item: any): { amount: number; label: string; includedInPrice: boolean } | null => {
  const preview = getLinePromoPreview(item)
  const amount = Number(preview?.tax_amount ?? item.tax_amount ?? item.taxAmount) || 0
  const category = String(
    preview?.tax_category
    ?? item.tax_category
    ?? item.taxCategory
    ?? item.product?.tax_category
    ?? '',
  ).toLowerCase()
  const resolution = String(preview?.tax_resolution ?? item.tax_resolution ?? '').toLowerCase()
  const includedInPrice = (
    preview?.included_in_price
    ?? item.included_in_price
    ?? item.includedInPrice
  ) === true
  const label = resolveLineTaxLabel(preview, category, item)

  if (category === 'exempt' || resolution === 'exempt') {
    return { amount: 0, label: t('pos.cartItem.taxExempt'), includedInPrice: false }
  }
  if (amount > 0) {
    const amountLabel = label
      || (category === 'liquor'
        ? (isGenericTaxLabel(taxPreview.value?.liquor_tax_label)
          ? t('pos.receipt.liquorVat')
          : String(taxPreview.value?.liquor_tax_label))
        : (isGenericTaxLabel(taxPreview.value?.standard_tax_label)
          ? t('pos.checkout.taxFallback')
          : String(taxPreview.value?.standard_tax_label || t('pos.checkout.taxFallback'))))
    return { amount, label: amountLabel, includedInPrice }
  }
  // Zero-amount non-exempt labels (e.g. IVA 16% with commercial tax off) must not surface (#2081).
  return null
}

const formatLineTaxDisplay = (info: { amount: number; label: string; includedInPrice: boolean }): string => {
  if (info.amount <= 0) return `+ ${info.label}`
  const amount = formatCurrency(info.amount)
  return `+ ${t('pos.cartItem.taxLine', { label: info.label, amount })}`
}

const lineTaxCueForPrint = (item: any): string | null => {
  const info = getLineTaxInfo(item)
  const category = String(
    item.tax_category
    ?? item.taxCategory
    ?? item.product?.tax_category
    ?? '',
  ).toLowerCase()
  const resolution = String(item.tax_resolution ?? item.taxResolution ?? '').toLowerCase()
  const isExempt = category === 'exempt' || resolution === 'exempt'
  const label = info?.label
    ?? localizedInternalTaxLabel(item.tax_label ?? item.taxLabel)
    ?? (isExempt ? t('pos.cartItem.taxExempt') : '')
  if (!label && !info) return null
  const mergedAmount = Number(item.tax_amount ?? item.taxAmount)
  const amount = Number.isFinite(mergedAmount) && mergedAmount > 0
    ? mergedAmount
    : (info?.amount ?? 0)
  const labelFinal = label || info!.label
  if (amount > 0) {
    const amountLabel = compactThermalMoneyLabel(formatCurrencyThermal(amount))
    return formatReceiptTaxCue({
      text: t('pos.cartItem.taxLine', { label: labelFinal, amount: amountLabel }),
    })
  }
  // Bare cue for exempt only — getLineTaxInfo returns $0 info solely for exempt (#2081).
  if ((isExempt || (info != null && info.amount <= 0)) && labelFinal) {
    return formatReceiptTaxCue({ label: labelFinal })
  }
  return null
}

/** Freeze per-line tax fields onto the receipt snapshot before cart clear. */
const snapshotCartItemsForReceipt = () =>
  cartItems.value.map((item: any) => {
    const preview = getLinePromoPreview(item)
    const info = getLineTaxInfo(item)
    const resolution = String(
      preview?.tax_resolution ?? item.tax_resolution ?? item.taxResolution ?? '',
    ).toLowerCase()
    const rawCategory = String(
      preview?.tax_category
      ?? item.tax_category
      ?? item.taxCategory
      ?? item.product?.tax_category
      ?? '',
    ).toLowerCase()
    const isExempt = resolution === 'exempt'
      || rawCategory === 'exempt'
      || (info != null && info.amount <= 0 && Boolean(info.label))
    return {
      ...item,
      tax_category: isExempt
        ? 'exempt'
        : (preview?.tax_category
          ?? item.tax_category
          ?? item.taxCategory
          ?? item.product?.tax_category
          ?? null),
      tax_label: info?.label ?? preview?.tax_label ?? null,
      tax_amount: info && info.amount > 0
        ? info.amount
        : (Number(preview?.tax_amount) || null),
      included_in_price: info?.includedInPrice ?? preview?.included_in_price ?? null,
    }
  })

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
      error?.data?.detail || error?.data?.message || t('pos.checkout.errors.updatePromo'),
      { title: t('pos.checkout.errorTitle') },
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

type PrintModifier = { id?: string; name: string; price?: number; quantity?: number; included_quantity?: number }

const getModifierLineTotal = (mod: PrintModifier) =>
  modifierLineTotal({ ...mod, price: Number(mod.price) || 0 })

const formatModifierPrintDesc = (mod: PrintModifier) => {
  const qty = Number(mod.quantity) || 1
  return qty > 1 ? `+ ${mod.name} x${qty}` : `+ ${mod.name}`
}

const prefacturaDash = receiptDivider()
const prefacturaStrong = receiptDivider(32, '=')
const prefacturaItemSep = receiptItemSeparator()
const prefacturaSectionSep = receiptSectionSeparator()

const prefacturaMoneyLine = (label: string, amount: number | string, negative = false) => {
  const amt = compactThermalMoneyLabel(formatCurrencyThermal(amount))
  return padReceiptLine(label, negative ? `-${amt}` : amt)
}

const prefacturaTaxBulletLine = (label: string, amount: number | string) =>
  formatReceiptTaxBulletLine({
    label,
    amountLabel: formatCurrencyThermal(amount),
  })


const prefacturaProductBlock = (item: any) =>
  formatReceiptProductBlock({
    name: `${item.product?.name || item.name || 'Item'}${isKitchenServiceMode.value && item.fired === false ? ' *' : ''}`,
    quantity: item.quantity,
    unitPriceLabel: formatCurrencyThermal(getItemUnitPrice(item)),
    lineTotalLabel: formatCurrencyThermal(getItemTotal(item)),
    taxCue: lineTaxCueForPrint(item),
    bullet: true,
  })

const prefacturaModifierBlock = (mod: PrintModifier) =>
  formatReceiptModifierBlock({
    description: formatModifierPrintDesc(mod),
    quantity: mod.quantity ?? 1,
    unitPriceLabel: formatCurrencyThermal(Number(mod.price) || 0),
    lineTotalLabel: formatCurrencyThermal(getModifierLineTotal(mod)),
  })

const receiptPrintLineGuards = (item: any) => [
  // Identity-only — never qty-scaled fields (net_total / promoSavings / discount)
  // or they block merging identical products (#1983).
  item.promo_opt_out,
  item.promoOptOut,
  item.promotionName,
  item.promoType,
  item.applied_promotion_id,
  item.tax_category,
  item.tax_label,
  item.included_in_price,
]

const checkoutProductKey = (item: any) =>
  item.product?.id
  ?? item.productId
  ?? item.product_id
  // Never fall back to line item.id — that prevents merging duplicates (#1983).
  ?? item.product?.name
  ?? item.productName
  ?? item.name

const consolidateCheckoutPrintItems = (items: any[]) =>
  consolidateReceiptPrintLines(items, {
    productKey: checkoutProductKey,
    displayName: item => item.product?.name ?? item.productName ?? item.name,
    quantity: item => item.quantity,
    unitPrice: item => getItemUnitPrice(item),
    total: item => getItemTotal(item),
    taxAmount: item => {
      const fromItem = Number(item.tax_amount ?? item.taxAmount)
      if (Number.isFinite(fromItem) && fromItem > 0) return fromItem
      return getLineTaxInfo(item)?.amount ?? 0
    },
    modifiers: item => item.modifiers ?? [],
    notes: item => item.notes,
    guards: receiptPrintLineGuards,
    merge: (item, aggregate) => ({
      ...item,
      quantity: aggregate.quantity,
      tax_amount: aggregate.taxAmount > 0 ? aggregate.taxAmount : item.tax_amount,
    }),
  })

const printablePrefacturaItems = computed(() =>
  consolidateCheckoutPrintItems(cartItems.value)
)

const printableReceiptItems = computed(() =>
  consolidateCheckoutPrintItems(cartItemsSnapshot.value)
)

const receiptTicketItems = computed(() =>
  buildReceiptTicketItems(consolidateCheckoutPrintItems(cartItemsSnapshot.value))
)

function checkoutErrorMessage(error: any, fallback: string) {
  const detail = error?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item: any) => item?.msg ?? JSON.stringify(item)).join('; ')
  }
  return error?.data?.message || error?.message || fallback
}

const pendingKitchenOrder = () => {
  const orders = mesaCurrentData.value?.data?.orders as Array<{ id?: string; status?: string; total_amount?: number }> | undefined
  return (orders || []).filter(order => order.status === 'pending' && order.id)
}

const openWompiSlideover = (orderId: string, amount: number, kitchen: boolean) => {
  wompiOrderId.value = orderId
  wompiAmount.value = amount
  wompiWasKitchen.value = kitchen
  showWompiSlideover.value = true
}

const finishWompiSale = async () => {
  const orderId = wompiOrderId.value
  if (!orderId) return
  showWompiSlideover.value = false
  try {
    if (wompiWasKitchen.value) {
      const session = posStore.activeTableSession
      if (session?.tableId) {
        try {
          await $fetch(`/api/tables/${session.tableId}/close`, {
            method: 'POST',
            body: {
              customer_id: selectedCustomer.value?.id ?? null,
            },
          })
          cache.invalidateQueries({ key: ['tables', currentTenant.value?.id ?? null] })
          wasMesaMode.value = !session.isBar
          if (session.isBar) posStore.exitSession()
        } catch (closeError: any) {
          processingError.value = checkoutErrorMessage(
            closeError,
            'El pago Wompi se aprobó. Si la mesa sigue abierta, ciérrala cuando no queden pendientes.',
          )
        }
        orderResult.value = {
          order_id: orderId,
          order_ids: [orderId],
          order_number: 0,
          total_amount: wompiAmount.value,
          payment_method: 'digital',
          payment_method_name: 'Wompi',
          status: 'completed',
          payment_status: 'paid',
          customer_id: selectedCustomer.value?.id,
        }
      }
    } else if (!orderResult.value) {
      orderResult.value = {
        order_id: orderId,
        order_number: 0,
        total_amount: wompiAmount.value,
        payment_method: 'digital',
        payment_method_name: 'Wompi',
        status: 'completed',
        payment_status: 'paid',
        customer_id: selectedCustomer.value?.id,
      }
    } else {
      orderResult.value = {
        ...orderResult.value,
        payment_method: 'digital',
        payment_method_name: 'Wompi',
        status: 'completed',
        payment_status: 'paid',
      }
    }
    cartItemsSnapshot.value = snapshotCartItemsForReceipt()
    applyReceiptEmailAfterSale(selectedCustomer.value)
    posStore.clearAll()
    showSuccessModal.value = true
  } catch (error: any) {
    processingError.value = checkoutErrorMessage(error, 'El pago Wompi se aprobó, pero no se pudo cerrar la mesa')
  } finally {
    wompiOrderId.value = null
    wompiWasKitchen.value = false
    isProcessing.value = false
  }
}

const processWompiCollection = async () => {
  if (showWompiSlideover.value) return
  if (splitMode.value) {
    processingError.value = 'Wompi no admite cobro dividido. Cobra el total con Wompi.'
    return
  }
  try {
    isProcessing.value = true
    processingError.value = ''
    const amount = finalAmountToCollect.value
    if (isPendingDeliveryMode.value && pendingOrderId.value) {
      if (!selectedCustomer.value) {
        processingError.value = t('pos.checkout.errors.selectCustomer')
        return
      }
      const _discountAmtPos = discountAmount.value
      const _subtotalPos = cartTotal.value
      const response = await $fetch(`/api/tables/pending-deliveries/${pendingOrderId.value}/complete`, {
        method: 'POST',
        body: {
          wompi_collection: true,
          customer_id: selectedCustomer.value.id,
          ...(discountEnabled.value && _discountAmtPos > 0
            ? { discount_type: discountType.value, discount_value: Number(discountInput.value) }
            : {}),
          ...checkoutServedByBody.value,
          ...checkoutTipBody.value,
          ...checkoutWaroBody.value,
        },
      }) as {
        success: boolean
        data: {
          order_id: string
          order_number: number
          total_amount: number
          status?: string
          payment_status?: string | null
        }
      }
      if (!response.success || !response.data.order_id) {
        processingError.value = t('pos.checkout.errors.processOrder')
        return
      }
      orderResult.value = {
        order_id: response.data.order_id,
        order_number: response.data.order_number,
        total_amount: response.data.total_amount,
        payment_method: 'digital',
        payment_method_name: 'Wompi',
        status: response.data.status,
        payment_status: response.data.payment_status,
        customer_id: selectedCustomer.value.id,
        ...(discountEnabled.value && _discountAmtPos > 0
          ? { discount_amount: _discountAmtPos, subtotal: _subtotalPos }
          : {}),
      }
      cache.invalidateQueries({ key: ['tables', 'pending-deliveries'] })
      openWompiSlideover(response.data.order_id, Number(response.data.total_amount || amount), false)
      return
    }
    if (isKitchenServiceMode.value) {
      const pending = pendingKitchenOrder()
      if (pending.length !== 1 || !pending[0]?.id) {
        processingError.value = pending.length > 1
          ? 'Wompi cobra una orden a la vez. Consolida o cierra el resto de la cuenta primero.'
          : 'No hay una orden pendiente para cobrar con Wompi'
        return
      }
      const orderAmount = Number(pending[0].total_amount)
      openWompiSlideover(pending[0].id, Number.isFinite(orderAmount) && orderAmount > 0 ? orderAmount : amount, true)
      return
    }
    if (!posStore.cartId) {
      processingError.value = t('pos.checkout.errors.cartNotSynced')
      return
    }
    const _discountAmtPos = discountAmount.value
    const _subtotalPos = cartTotal.value
    const response = await $fetch(`/api/pos/cart/${posStore.cartId}/complete`, {
      method: 'POST',
      body: {
        wompi_collection: true,
        customer_id: selectedCustomer.value!.id,
        ...(discountEnabled.value && _discountAmtPos > 0
          ? { discount_type: discountType.value, discount_value: Number(discountInput.value) }
          : {}),
        ...(posStore.activeTableSession?.isBar
          ? { table_session_id: posStore.activeTableSession.sessionId }
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
        ...checkoutTipBody.value,
        ...checkoutWaroBody.value,
      },
    }) as { success: boolean; data: { order_id: string; order_number: number; total_amount: number; status?: string; payment_status?: string | null } }
    if (!response.success || !response.data.order_id) {
      processingError.value = t('pos.checkout.errors.processOrder')
      return
    }
    orderResult.value = {
      order_id: response.data.order_id,
      order_number: response.data.order_number,
      total_amount: response.data.total_amount,
      payment_method: 'digital',
      payment_method_name: 'Wompi',
      status: response.data.status,
      payment_status: response.data.payment_status,
      customer_id: selectedCustomer.value?.id,
      ...(discountEnabled.value && _discountAmtPos > 0
        ? { discount_amount: _discountAmtPos, subtotal: _subtotalPos }
        : {}),
    }
    openWompiSlideover(response.data.order_id, Number(response.data.total_amount || amount), false)
  } catch (error: any) {
    processingError.value = checkoutErrorMessage(error, t('pos.checkout.errors.processOrder'))
  } finally {
    isProcessing.value = false
  }
}

const completePendingDeliveryPayment = async () => {
  if (!pendingOrderId.value || !selectedCustomer.value) return
  if (splitMode.value) {
    await addSplitPayment()
    return
  }
  try {
    isProcessing.value = true
    processingError.value = ''
    if (!(await ensureWalletTenderCanPay(finalAmountToCollect.value))) return
    const _discountAmt = discountAmount.value
    const _subtotal = cartTotal.value
    const response = await $fetch(`/api/tables/pending-deliveries/${pendingOrderId.value}/complete`, {
      method: 'POST',
      body: {
        payment_method: selectedPaymentMethod.value,
        payment_method_id: selectedPaymentMethodId.value ?? null,
        customer_id: selectedCustomer.value.id,
        ...(selectedGroup.value?.triggersCartera && creditDueDate.value
          ? { credit_due_date: creditDueDate.value }
          : {}),
        ...(discountEnabled.value && _discountAmt > 0
          ? { discount_type: discountType.value, discount_value: Number(discountInput.value) }
          : {}),
        ...(isCashMethod.value
          ? { cash_received: Number(cashReceivedInput.value) }
          : {}),
        ...checkoutServedByBody.value,
        ...checkoutTipBody.value,
        ...checkoutWaroBody.value,
      },
    }) as {
      success: boolean
      data: {
        order_id: string
        order_number: number
        total_amount: number
        status?: string
        payment_status?: string | null
        payment_method?: string | null
        customer_id?: string | null
        standard_tax?: number
        liquor_tax?: number
        standard_tax_label?: string
        liquor_tax_label?: string
      }
    }
    if (!response.success) {
      processingError.value = t('pos.checkout.errors.processOrder')
      return
    }
    const subMethodName = selectedPaymentMethodId.value
      ? selectedGroup.value?.methods.find(m => m.id === selectedPaymentMethodId.value)?.name
      : undefined
    finalizePendingDeliverySuccess(response.data, {
      paymentMethod: response.data.payment_method ?? selectedPaymentMethod.value,
      paymentMethodName: subMethodName ?? null,
    })
  } catch (error: any) {
    processingError.value = checkoutErrorMessage(error, t('pos.checkout.deliveryCheckout.completePendingError'))
  } finally {
    isProcessing.value = false
  }
}

const processOrder = async () => {
  if (showWompiSlideover.value) return
  // Mesa mode: close the table session as payment
  if (!selectedCustomer.value) {
    processingError.value = t('pos.checkout.errors.selectCustomer')
    return
  }
  if (!manualDiscountIsValid.value) {
    processingError.value = discountValidationError.value
    return
  }
  if (isWompiTender.value) {
    await processWompiCollection()
    return
  }

  if (isPendingDeliveryMode.value) {
    await completePendingDeliveryPayment()
    return
  }

  if (isDeferredDeliveryPayment.value && posStore.activeTableSession?.isBar) {
    if (!addressStore.selectedAddressId) {
      processingError.value = t('pos.checkout.deliveryCheckout.selectOrCreateAddress')
      return
    }
    if (storeTabItems.value.length === 0) {
      processingError.value = t('pos.checkout.deliveryCheckout.pendingSaleNeedsKitchen')
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
          standard_tax_label: localizedInternalTaxLabel(taxPreview.value?.standard_tax_label),
          liquor_tax_label: localizedInternalTaxLabel(taxPreview.value?.liquor_tax_label),
          ...promoFieldsForReceipt(cartTotal.value),
          ...orderDiscountFieldsFromCheckout(null, cartTotal.value),
        }
        wasMesaMode.value = false
        cartItemsSnapshot.value = snapshotCartItemsForReceipt()
        captureReceiptPrintContext()
        receiptEmail.value = ''
        emailSent.value = false
        lastSentEmail.value = ''
        emailFromProfile.value = false
        posStore.exitSession()
        cache.invalidateQueries({ key: ['tables', currentTenant.value?.id ?? null] })
        showSuccessModal.value = true
        document.body.classList.remove('printing-prefactura')
        prefacturaPrintSnapshot.value = null
      }
    } catch (error: any) {
      processingError.value = checkoutErrorMessage(error, t('pos.checkout.deliveryCheckout.deferSaleError'))
    } finally {
      isProcessing.value = false
    }
    return
  }

  if (isKitchenServiceMode.value) {
    const session = posStore.activeTableSession!
    if (session.isBar && storeTabItems.value.length === 0) {
      processingError.value = t('pos.checkout.errors.addItemsBeforeCharge')
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
        standard_tax_label: localizedInternalTaxLabel(closeData.standard_tax_label),
        liquor_tax_label: localizedInternalTaxLabel(closeData.liquor_tax_label),
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
      cartItemsSnapshot.value = snapshotCartItemsForReceipt()
      captureReceiptPrintContext({
        singleCashReceived: isCashMethod.value && cashReceivedInput.value > 0
          ? Number(cashReceivedInput.value)
          : null,
        singleCashChange: isCashMethod.value ? cashChange.value : null,
      })
      applyReceiptEmailAfterSale(selectedCustomer.value)
      posStore.clearAll()
      if (session.isBar) {
        posStore.exitSession()
      }
      showSuccessModal.value = true
      document.body.classList.remove('printing-prefactura')
      prefacturaPrintSnapshot.value = null
    } catch (error: any) {
      processingError.value = checkoutErrorMessage(error, t('pos.checkout.errors.closeTable', { table: tableSingularLower.value }))
    } finally {
      isProcessing.value = false
    }
    return
  }

  // Standard POS mode
  if (!selectedCustomer.value) {
    processingError.value = t('pos.checkout.errors.selectCustomer')
    return
  }

  if (!posStore.cartId) {
    processingError.value = t('pos.checkout.errors.cartNotSynced')
    return
  }

  if (deliveryEnabled.value && !addressStore.selectedAddressId) {
    processingError.value = t('pos.checkout.deliveryCheckout.selectOrCreateAddress')
    return
  }

  try {
    isProcessing.value = true
    processingError.value = ''
    if (!(await ensureWalletTenderCanPay(finalAmountToCollect.value))) return

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
        liquor_tax_label?: string
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
        standard_tax_label: localizedInternalTaxLabel(response.data.standard_tax_label),
        liquor_tax_label: localizedInternalTaxLabel(response.data.liquor_tax_label),
        ...promoFieldsFromCloseResponse(response.data, _subtotalPos),
        ...orderDiscountFieldsFromCheckout(response.data, _subtotalPos),
        // warocol.com#639 — surface tip in the success modal when present
        ...(response.data.tip_amount && response.data.tip_amount > 0
          ? { tip_amount: response.data.tip_amount, charged_amount: response.data.charged_amount }
          : {}),
        ...waroOrderResultFields(
          response.data.waro_redemption_summary,
          Number(response.data.subtotal) || _subtotalPos,
        ),
      }
      cartItemsSnapshot.value = snapshotCartItemsForReceipt()
      captureReceiptPrintContext({
        singleCashReceived: isCashMethod.value && cashReceivedInput.value > 0
          ? Number(cashReceivedInput.value)
          : null,
        singleCashChange: isCashMethod.value ? cashChange.value : null,
      })
      applyReceiptEmailAfterSale(selectedCustomer.value)
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
    processingError.value = checkoutErrorMessage(error, t('pos.checkout.errors.processOrder'))
  } finally {
    isProcessing.value = false
  }
}

const onCustomerIdentified = async (customer: { id: string; name: string | null; phone_number: string | null; email: string | null }) => {
  if (isPendingDeliveryMode.value) return
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
const checkoutVisiblePaymentGroups = computed(() =>
  posPaymentGroups.value.filter(group => isPaymentGroupVisible(group)),
)
const checkoutPaymentSelection = computed({
  get: () => ({
    slug: selectedPaymentMethod.value,
    id: selectedPaymentMethodId.value,
  }),
  set: (selection: { slug: string; id: string | null }) => {
    selectedPaymentMethod.value = selection.slug
    selectedPaymentMethodId.value = selection.id
    if (selection.slug) {
      deliveryEnabled.value = false
    }
  },
})
const isWompiTender = computed(() => {
  const group = selectedGroup.value
  if (!group) return false
  const method = selectedPaymentMethodId.value
    ? group.methods?.find(m => m.id === selectedPaymentMethodId.value)
    : null
  if (method) return isWompiPaymentMethod(method)
  if ((group.methods?.length ?? 0) === 1) return isWompiPaymentMethod(group.methods[0])
  return isWompiPaymentMethod(group)
})
const canDeferDeliveryPayment = computed(() =>
  isDeliveryEligible.value && !isPendingDeliveryMode.value
)
const isDeferredDeliveryPayment = computed(() =>
  deliveryEnabled.value && !isMesaMode.value && !selectedPaymentMethod.value
)
const deferDeliveryPayment = () => {
  if (!selectedCustomer.value || isAnonymousCustomer.value) {
    processingError.value = t('pos.checkout.deliveryCheckout.realCustomerRequired')
    return
  }
  deliveryEnabled.value = true
  selectedPaymentMethod.value = ''
  selectedPaymentMethodId.value = null
}

watch(deliveryEnabled, (enabled) => {
  if (!enabled && !selectedPaymentMethod.value) {
    selectedPaymentMethod.value = 'cash'
    selectedPaymentMethodId.value = null
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
  if (!selectedCustomer.value) return t('pos.wallet.identifyCustomer')
  if (isAnonymousCustomer.value) return t('pos.wallet.requiresIdentified')
  if (isWalletPending.value) return t('pos.wallet.checking')
  if (walletBalanceCop.value <= 0) return t('pos.wallet.noBalance')
  return ''
})

const walletTenderValidationMessage = computed(() => {
  if (!isWalletMethod.value) return ''
  if (walletUnavailableMessage.value) return walletUnavailableMessage.value
  if (walletChargeAmount.value > walletBalanceCop.value) {
    return t('pos.wallet.insufficient', { amount: formatCurrency(walletBalanceCop.value) })
  }
  return ''
})

async function ensureWalletTenderCanPay(amount: number) {
  if (!isWalletMethod.value) return true
  if (!selectedCustomer.value || isAnonymousCustomer.value) {
    processingError.value = t('pos.wallet.realCustomerRequired')
    return false
  }
  try {
    await refetchWallet()
  } catch {
    // The backend remains authoritative; use the last cached balance if refresh fails.
  }
  if (walletBalanceCop.value <= 0) {
    processingError.value = t('pos.wallet.noBalance')
    return false
  }
  if (amount > walletBalanceCop.value) {
    processingError.value = t('pos.wallet.insufficient', { amount: formatCurrency(walletBalanceCop.value) })
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
// The exact-cash shortcut was already chosen, which was confusing. Reset to 0 only when
// the method group changes (so switching methods clears the previous tender).
watch(
  isCashMethod,
  () => {
    cashReceivedInput.value = 0
  },
)

// Issue #524 — thousand-separator formatting lives in CheckoutCashTenderPanel.

const getPaymentMethodLabel = (method: string) => {
  if (method === 'table_session_advance') return t('pos.payment.tableAdvance')
  const defaultKey = `pos.payment.defaults.${method}`
  const translated = t(defaultKey)
  if (translated !== defaultKey) return translated
  return posPaymentGroups.value.find(g => g.slug === method)?.name ?? method
}

const getPaymentGroupLabel = (group: PosPaymentGroup | null | undefined) => {
  if (!group) return ''
  const defaultKey = `pos.payment.defaults.${group.slug}`
  const translated = t(defaultKey)
  return translated !== defaultKey ? translated : group.name
}

// True when the selected group has sub-methods but none is chosen yet
const requiresMethodSelection = computed(() =>
  (selectedGroup.value?.methods?.length ?? 0) > 0 && !selectedPaymentMethodId.value
)

/** Template cannot resolve global sessionStorage — bind via this helper. */
const backToPos = () => {
  if (import.meta.client) {
    window.sessionStorage.setItem('posNavigation', 'true')
  }
  router.push('/pos')
}

const cancelOrder = async () => {
  if (splitPayments.value.length > 0) {
    if (!window.confirm(t('pos.checkout.split.cancelWithPartials'))) return
  }
  if (posStore.activeTableSession?.isBar) {
    // Bar session — clear local cart but keep session alive (it's permanent)
    posStore.clearCart()
  }
  backToPos()
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  emailFromProfile.value = false
  emailSent.value = false
  lastSentEmail.value = ''
  receiptEmail.value = ''
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
    invoiceError.value = t('pos.checkout.invoice.creditOnlyBlocked')
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
      if (ids.length > 1) invoiceProgress.value = t('pos.checkout.invoice.billingProgress', { current: i + 1, total: ids.length })
      try {
        const result = await $fetch(`/api/pos/orders/${ids[i]}/invoice`, { method: 'POST' }) as any
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
            error: result.error_message || t('pos.checkout.invoice.rejected', { label: `${result.prefix}-${result.invoice_number}` }),
          })
        }
        // For single order, set the legacy invoiceResult for QR/print
        if (ids.length === 1 && result.status === 'accepted') {
          let invoiceDetail: any = null
          try {
            invoiceDetail = await $fetch(`/api/pos/orders/${ids[i]}/invoice`)
          } catch {
            // The accepted POST remains authoritative; without presentation we
            // omit the acquirer instead of guessing it from the mutable profile.
          }
          invoiceResult.value = {
            cufe: result.cufe || '',
            invoice_number: result.invoice_number,
            prefix: result.prefix,
            pdf_presigned_url: result.pdf_presigned_url || null,
            status: result.status,
            emitted_at: result.emitted_at || null,
            created_at: result.created_at || null,
            presentation: invoiceDetail?.presentation ?? result.presentation ?? null,
          }
          if (result.cufe) {
            invoiceQrDataUrl.value = await buildInvoiceQrDataUrl(result.cufe)
          }
        } else if (ids.length === 1 && result.status !== 'accepted') {
          invoiceError.value = result.error_message || t('pos.checkout.invoice.invoiceRejected', { label: `${result.prefix}-${result.invoice_number}` })
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
        invoiceError.value = t('pos.checkout.invoice.multiFailed', { failed, total: ids.length })
      }
    }
    invoiceProgress.value = ''
    const feAccepted = invoiceResult.value?.status === 'accepted'
      || invoiceResults.value.some(r => r.status === 'accepted')
    if (feAccepted) {
      await maybeAutoSendInvoiceEmailAfterFe()
    }
  } catch (e: any) {
    invoiceError.value = extractInvoiceFetchError(e)
  } finally {
    invoiceLoading.value = false
    invoiceProgress.value = ''
  }
}

const printReceipt = async () => {
  // iPad/Android transient: if cached assignments show no caja, fire window.print sync; QR precargado via watch.
  const cachedCaja = getCachedCajaPrinterName()
  if (typeof cachedCaja !== 'undefined' && !String(cachedCaja || '').trim()) {
    document.body.classList.remove('printing-prefactura')
    document.body.classList.add('printing-receipt-ticket')
    await nextTick()
    const earlyCleanup = () => {
      document.body.classList.remove('printing-receipt-ticket')
      window.removeEventListener('afterprint', earlyCleanup)
    }
    window.addEventListener('afterprint', earlyCleanup, { once: true } as AddEventListenerOptions)
    window.print()
    window.setTimeout(earlyCleanup, 1500)
    return
  }

  // Ensure post-payment receipt wins over a prior prefactura print (#939).
  document.body.classList.remove('printing-prefactura')
  document.body.classList.add('printing-receipt-ticket')
  const syncBrowserPrint = typeof window !== 'undefined' ? window.print.bind(window) : () => {}
  let browserPrintFiredSync = false
  const cleanup = () => {
    document.body.classList.remove('printing-receipt-ticket')
    window.removeEventListener('afterprint', cleanup)
  }
  if (invoiceResult.value?.cufe && !invoiceQrDataUrl.value) {
    void buildInvoiceQrDataUrl(invoiceResult.value.cufe).then(url => { invoiceQrDataUrl.value = url })
  }
  await nextTick()
  // Defer window.print until after await so body print classes stay until fallback.
  // Prefer teleported ReceiptPrintTicket (plain-text layout #1979), not flex #pos-receipt.
  const printResult = await printTicketElement('pos-receipt', {
    browserPrint: () => { browserPrintFiredSync = true; syncBrowserPrint() },
    getElementHtml: () => {
      if (typeof document === 'undefined') return null
      const el = document.querySelector('.receipt-print-ticket')
      return collectThermalTicketText(el) || null
    },
  })
  if (printResult.mode === 'bridge') {
    cleanup()
    notifyCajaPrintResult(printResult, {
      t,
      toast,
      onRetry: () => { void printReceipt() },
      onBrowserPrint: () => {
        document.body.classList.add('printing-receipt-ticket')
        window.addEventListener('afterprint', cleanup)
        setTimeout(cleanup, 1500)
        syncBrowserPrint()
      },
    })
    return
  }
  if (printResult.mode === 'skipped') {
    cleanup()
    return
  }
  window.addEventListener('afterprint', cleanup)
  setTimeout(cleanup, 1500)
  if (!browserPrintFiredSync) syncBrowserPrint()
}

// Issue #535 — tenant fiscal data for the prefactura header.
// Read from the POS restaurant-context aggregator (settingsData above) so
// the cashier doesn't need MI_NEGOCIO. The /facturacion owner panel reads
// /api/api/tenant/fiscal-data directly with its richer write surface.
const fiscalData = computed(() => settingsData.value?.data?.fiscal_data ?? null)
/** WARO + Matias print labels from backend env (not tenant issuer). */
const platformLegal = computed(() => settingsData.value?.data?.platform_legal ?? null)

const receiptPrintSettings = computed(() =>
  settingsData.value?.data?.receipt_print_settings ?? { document_label: t('pos.receipt.documentPrefactura'), tip_label: t('pos.receipt.tipDefault'), show_logo: true },
)

const receiptTipLabel = computed(() => {
  const label = (receiptPrintSettings.value.tip_label || t('pos.receipt.tipDefault')).trim()
  return label || t('pos.receipt.tipDefault')
})

const receiptLogoUrl = computed(() => {
  if (!receiptPrintSettings.value.show_logo) return null
  const url = settingsData.value?.data?.logo_url ?? businessProfile.value?.logo_url ?? null
  return resolveReceiptLogoUrl(url)
})

// warocol.com#939 — pre-bill always reads as prefactura; post-payment uses receiptDocumentLabel.
const prefacturaDocumentLabel = computed(() => {
  const label = (receiptPrintSettings.value.document_label || '').trim()
  if (!label || /factura/i.test(label) || /prefactura|pre-cuenta|pre cuenta|precuenta/i.test(label)) {
    return t('pos.receipt.documentPrefactura')
  }
  return label
})

const receiptDocumentLabel = computed(() => {
  const label = (receiptPrintSettings.value.document_label || '').trim()
  // Prefactura-like labels first — /factura/i matches the "factura" substring in "Prefactura" (#942).
  if (!label || /prefactura|pre-cuenta|pre cuenta|precuenta|pre-factura|pre factura/i.test(label)) return t('pos.receipt.documentFactura')
  if (/factura/i.test(label)) return label
  return label
})

const prefacturaTaxTotal = computed(() => additiveTaxTotal.value)

// Mesa runningTotal already includes session taxes; counter cartTotal is pre-tax.
// Counter amount due adds only additive (exclusive) tax — included-in-price tax stays in prices.
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
  return name ? `WaRo: ${name}` : t('pos.receipt.waroRedeem')
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
const isCreditOnlyInvoiceBlocked = computed(() => {
  const lines = splitPaymentsSnapshot.value
  if (lines.length > 0) {
    return lines.every(p => p.payment_method === 'credit')
  }
  return orderResult.value?.payment_method === 'credit'
})

const receiptPromoBreakdown = computed(() => {
  const breakdown = orderResult.value?.promo_breakdown ?? []
  if (breakdown.length > 0) return breakdown
  const savings = Number(orderResult.value?.promo_savings) || 0
  if (savings <= 0) return []
  return [{ promotion_name: t('pos.receipt.promoFallback'), promo_type: '', savings }]
})

const receiptPaymentLines = computed(() =>
  splitPaymentsSnapshot.value.map(payment => ({
    id: payment.id,
    label: payment.payment_method_name,
    amount: Number(payment.amount) || 0,
    change: Number(payment.change) || null,
  })),
)

const receiptSinglePaymentLabel = computed(() => {
  const result = orderResult.value
  if (!result?.payment_method) return null
  return result.payment_method_name
    ? `${getPaymentMethodLabel(result.payment_method)} · ${result.payment_method_name}`
    : getPaymentMethodLabel(result.payment_method)
})

const receiptLocationLabel = computed(() => {
  const context = receiptPrintContext.value
  if (!context) return null
  if (deliveryEnabled.value) return t('ventas.common.domicilio')
  if (context.wasMesa && context.tableName) return `${tableSingular.value} ${context.tableCode} - ${context.tableName}`
  if (context.isBar) return t('pos.receipt.bar')
  return t('pos.receipt.counter')
})

const receiptCustomerFiscalLabel = computed(() => {
  const context = receiptPrintContext.value
  if (!context?.customerFiscalId) return null
  return [context.customerFiscalIdType, context.customerFiscalId].filter(Boolean).join(': ')
})

const receiptInvoiceIssuedAt = computed(() =>
  formatOptionalTenantDateTime(invoiceResult.value?.emitted_at || invoiceResult.value?.created_at) || receiptPrintContext.value?.soldAt || null,
)

const receiptInvoiceTaxLines = computed(() => {
  const result = orderResult.value
  if (!result) return []
  return [
    {
      label: localizedInternalTaxLabel(result.standard_tax_label),
      amount: Number(result.standard_tax) || 0,
    },
    {
      label: localizedInternalTaxLabel(result.liquor_tax_label) || t('pos.receipt.liquorVat'),
      amount: Number(result.liquor_tax) || 0,
    },
  ].filter(line => Number(line.amount) > 0)
})

const receiptIssuerLabel = computed(() => {
  const name = fiscalData.value?.business_name?.trim() || null
  const nit = fiscalData.value?.nit?.trim() || null
  if (name && nit) return `${name} - NIT ${nit}`
  return name || (nit ? `NIT ${nit}` : null)
})

const receiptInvoice = computed(() => {
  const invoice = invoiceResult.value
  if (!invoice) return null
  const invoiceIdentity = buildCustomerIdentityPresentation(
    selectedCustomer.value,
    invoice.presentation?.acquirer,
  )
  const resolutionNumber = String(
    invoice.presentation?.resolution?.number
    ?? invoice.presentation?.resolution?.resolution_number
    ?? '',
  ).trim()
  return {
    prefix: invoice.prefix,
    invoice_number: invoice.invoice_number,
    cufe: invoice.cufe,
    status: invoice.status,
    qrDataUrl: invoiceQrDataUrl.value,
    issuedAt: receiptInvoiceIssuedAt.value,
    paymentLabel: receiptSinglePaymentLabel.value,
    taxLines: receiptInvoiceTaxLines.value,
    // Emisor FE = tenant fiscal only (Matias client_uuid is technical; WARO is not issuer)
    issuerLabel: receiptIssuerLabel.value,
    // Adquirente FE = snapshot fiscal returned by the invoice presentation.
    acquirerLabel: invoice.presentation?.acquirer
      ? formatFiscalIdentityLabel(invoiceIdentity.acquirer)
      : null,
    resolutionText: resolutionNumber
      ? t('pos.receipt.dianResolution', { number: resolutionNumber })
      : null,
  }
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
      ? (customer.name || customer.phone_number)
      : null,
    customerPhone: customer && customer.phone_number !== '0000000000'
      ? customer.phone_number
      : null,
    customerEmail: customer && customer.phone_number !== '0000000000'
      ? customer.email
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

const checkoutReceiptDelivery = computed((): ReceiptDeliveryFields | null => {
  if (!deliveryEnabled.value) return null
  const addr = addressStore.selectedAddress
  const notes = [addr?.delivery_notes, deliveryInstructions.value]
    .map(part => String(part ?? '').trim())
    .filter(Boolean)
    .join(' · ')
  if (!addr && !notes) return null
  return {
    addressLine1: addr?.address_line1 ?? null,
    addressLine2: addr?.address_line2 ?? null,
    city: addr?.city ?? null,
    state: addr?.state ?? null,
    notes: notes || null,
    timeLabel: t('pos.receipt.deliveryImmediate'),
  }
})

const prefacturaSaleMetaLine = computed(() => {
  const session = posStore.activeTableSession
  const mesaLabel = isKitchenServiceMode.value && session?.tableName
    ? `${tableSingular.value} ${prefacturaTableCode.value} — ${session.tableName}`
    : null
  return joinReceiptParts([
    prefacturaDateTime.value,
    mesaLabel,
    deliveryEnabled.value ? t('ventas.common.domicilio') : null,
    !deliveryEnabled.value && !mesaLabel && session?.isBar ? t('pos.receipt.bar') : null,
    !deliveryEnabled.value && !mesaLabel && !session?.isBar ? t('pos.receipt.counter') : null,
    prefacturaWaiterName.value
      ? t('pos.receipt.waiter', { name: prefacturaWaiterName.value })
      : null,
  ])
})

const prefacturaSaleContactLine = computed(() => {
  const customer = selectedCustomer.value
  if (!customer || isAnonymousCustomer.value) return ''
  return joinReceiptParts([
    customer.name || null,
    customer.phone_number
      ? t('pos.receipt.phone', { phone: customer.phone_number })
      : null,
    customer.email
      ? t('pos.receipt.email', { email: customer.email })
      : null,
    customer.fiscal_id && !selectedCustomerIdentity.value.showSeparateAcquirer
      ? `${customer.fiscal_id_type}: ${customer.fiscal_id}`
      : null,
  ])
})

const prefacturaAcquirerLine = computed(() => {
  if (!selectedCustomerIdentity.value.showSeparateAcquirer) return ''
  const acquirer = selectedCustomerIdentity.value.acquirer
  return joinReceiptParts([
    acquirer.name || null,
    acquirer.fiscalId
      ? `${acquirer.fiscalIdType}: ${acquirer.fiscalId}`
      : null,
    acquirer.email
      ? t('pos.receipt.email', { email: acquirer.email })
      : null,
  ])
})

const checkoutSaleMetaLine = computed(() => {
  const ctx = receiptPrintContext.value
  if (!ctx) return ''
  return joinReceiptParts([
    ctx.soldAt || null,
    ctx.wasMesa && ctx.tableName
      ? `${tableSingular.value} ${ctx.tableCode} — ${ctx.tableName}`
      : null,
    deliveryEnabled.value ? t('ventas.common.domicilio') : null,
    !deliveryEnabled.value && !ctx.wasMesa && ctx.isBar ? t('pos.receipt.bar') : null,
    !deliveryEnabled.value && !ctx.wasMesa && !ctx.isBar ? t('pos.receipt.counter') : null,
    ctx.waiterName ? t('pos.receipt.waiter', { name: ctx.waiterName }) : null,
  ])
})

const checkoutSaleContactLine = computed(() => {
  const ctx = receiptPrintContext.value
  if (!ctx?.customerName && !ctx?.customerPhone && !ctx?.customerEmail) return ''
  return joinReceiptParts([
    ctx?.customerName || null,
    ctx?.customerPhone ? t('pos.receipt.phone', { phone: ctx.customerPhone }) : null,
    ctx?.customerEmail ? t('pos.receipt.email', { email: ctx.customerEmail }) : null,
    !invoiceResult.value && ctx?.customerFiscalId
      ? `${ctx.customerFiscalIdType}: ${ctx.customerFiscalId}`
      : null,
  ])
})

// Prefactura is purely visual — never block on tax preview state. If taxes
// haven't loaded (or the tenant has no taxes configured), the prefactura
// just omits those lines. The prefactura footer disclaimer makes the document
// non-fiscal, so printing without taxes is acceptable.
const prefacturaDisabled = computed(() => false)
const printPrefactura = async () => {
  capturePrefacturaPrintSnapshot()
  const cachedCaja = getCachedCajaPrinterName()
  if (typeof cachedCaja !== 'undefined' && !String(cachedCaja || '').trim()) {
    document.body.classList.add('printing-prefactura')
    await nextTick()
    const earlyCleanup = () => {
      document.body.classList.remove('printing-prefactura')
      window.removeEventListener('afterprint', earlyCleanup)
    }
    window.addEventListener('afterprint', earlyCleanup, { once: true } as AddEventListenerOptions)
    setTimeout(earlyCleanup, 2000)
    window.print()
    return
  }
  document.body.classList.add('printing-prefactura')
  const syncBrowserPrint = typeof window !== 'undefined' ? window.print.bind(window) : () => {}
  let browserPrintFiredSync = false

  const cleanup = () => {
    document.body.classList.remove('printing-prefactura')
    window.removeEventListener('afterprint', cleanup)
  }

  await nextTick()
  // Defer window.print until after await so body print classes stay until fallback.
  const printResult = await printTicketElement('pos-prefactura', {
    browserPrint: () => { browserPrintFiredSync = true; syncBrowserPrint() },
    getElementHtml: () => {
      if (typeof document === 'undefined') return null
      return collectThermalTicketText(document.getElementById('pos-prefactura')) || null
    },
  })
  if (printResult.mode === 'bridge') {
    cleanup()
    notifyCajaPrintResult(printResult, {
      t,
      toast,
      onRetry: () => { void printPrefactura() },
      onBrowserPrint: () => {
        document.body.classList.add('printing-prefactura')
        window.addEventListener('afterprint', cleanup)
        setTimeout(cleanup, 2000)
        syncBrowserPrint()
      },
    })
    return
  }
  if (printResult.mode === 'skipped') {
    cleanup()
    return
  }
  window.addEventListener('afterprint', cleanup)
  // Defensive fallback for browsers where afterprint may not fire on cancel.
  setTimeout(cleanup, 2000)
  if (!browserPrintFiredSync) syncBrowserPrint()
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
    invoiceError.value = t('pos.checkout.invoice.creditOnlyBlocked')
    return
  }
  if (selectedCustomer.value && !selectedCustomer.value.fiscal_id && !isAnonymousCustomer.value) {
    selectedCustomer.value = await hydrateCustomerFiscalIfMissing(selectedCustomer.value)
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
      `/api/pos/customers/${selectedCustomer.value.id}`,
      {
        method: 'PATCH',
        body: {
          fiscal_id_type: fiscalWizardForm.value.fiscal_id_type || null,
          fiscal_id: normalizeFiscalDocumentId(fiscalWizardForm.value.fiscal_id) || null,
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
    fiscalWizardError.value = e.data?.detail || e.data?.message || e.message || t('pos.customer.saveDataError')
  } finally {
    fiscalWizardSaving.value = false
  }
}

// Emit the invoice without auto-printing.
// Printing is always manual via the print-receipt action.
const generateInvoiceAndPrint = async () => {
  await generateInvoice()
}

/** CO FE only: after accepted emit, send invoice email if address is known (#1893). */
const maybeAutoSendInvoiceEmailAfterFe = async () => {
  if (!isMatiasDian.value) return
  if (invoiceResult.value?.status !== 'accepted' && !invoiceResults.value.some(r => r.status === 'accepted')) {
    return
  }
  const email = (receiptEmail.value || '').trim()
  if (!email) {
    toast.info(t('pos.checkout.invoice.autoEmailMissing'), {
      title: t('pos.checkout.invoice.sendByEmail'),
    })
    return
  }
  const alreadySent = emailSent.value
  await sendReceiptEmail()
  if (!alreadySent && emailSent.value) {
    toast.success(t('pos.checkout.receiptEmail.sentTo', { email }), {
      title: t('pos.checkout.invoice.sendByEmail'),
    })
  }
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
        order_id: orderResult.value.order_id || orderResult.value.order_ids?.[0] || null,
        total_amount: orderResult.value.total_amount,
        payment_method: orderResult.value.payment_method,
        items: itemsForEmail,
        business_name: posCheckoutBusiness.value.display_name,
        business_address: posCheckoutBusiness.value.address,
        business_city: posCheckoutBusiness.value.city,
        business_phone: posCheckoutBusiness.value.phone_number,
        discount_amount: orderResult.value.discount_amount ?? 0,
        subtotal: orderResult.value.subtotal ?? 0,
        standard_tax: orderResult.value.standard_tax ?? 0,
        liquor_tax: orderResult.value.liquor_tax ?? 0,
        standard_tax_label: localizedInternalTaxLabel(orderResult.value.standard_tax_label),
        liquor_tax_label: localizedInternalTaxLabel(orderResult.value.liquor_tax_label),
        promo_savings: orderResult.value.promo_savings ?? 0,
        promo_breakdown: orderResult.value.promo_breakdown ?? [],
        waro_redemption_summary: orderResult.value.waro_redemption_summary ?? null,
        invoice_prefix: invoiceResult.value?.prefix ?? null,
        invoice_number: invoiceResult.value?.invoice_number ?? null,
        invoice_cufe: invoiceResult.value?.cufe ?? null,
        tip_amount: orderResult.value.tip_amount ?? 0,
      }
    })
    const sentTo = (receiptEmail.value || '').trim()
    emailSent.value = true
    lastSentEmail.value = sentTo
    // Keep form open for another recipient (#2023)
    receiptEmail.value = ''
    emailFromProfile.value = false
  } catch (e: any) {
    // Surface the failure so the cashier knows the email did NOT go out (#134).
    // Most common case: 422 from EmailStr validation when the address is empty
    // or malformed. detail can be either an array (Pydantic) or a string.
    const detail = e?.data?.detail
    const message =
      Array.isArray(detail)
        ? detail[0]?.msg ?? t('pos.checkout.receiptEmail.fallbackError')
        : typeof detail === 'string'
          ? detail
          : t('pos.checkout.receiptEmail.invalidError')
    toast.error(message, { title: t('pos.checkout.sendReceiptErrorTitle') })
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
      syncError.value = t('pos.checkout.errors.syncCart')
      posDebugLog('checkout', 'syncCart:batch-failed', { cartId: posStore.cartId })
    } else {
      posDebugLog('checkout', 'syncCart:ok', { cartId: posStore.cartId })
    }
  } catch (error: any) {
    syncError.value = error.message || t('pos.checkout.errors.sync')
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
  if (isPendingDeliveryMode.value) {
    return pendingDeliveryStatus.value === 'pending' && !pendingDeliveryPayload.value
  }
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
const checkoutError = computed(() => {
  if (isPendingDeliveryMode.value) return pendingDeliveryError.value
  return isKitchenServiceMode.value ? mesaCurrentError.value : null
})

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const refreshAll = async () => {
  await Promise.all([
    cache.invalidateQueries({ key: ['pos', 'payment-methods'] }),
    isKitchenServiceMode.value
      ? cache.invalidateQueries({ key: ['tables', posStore.activeTableSession?.tableId ?? null, 'current'] })
      : cache.invalidateQueries({ key: ['pos', 'cart', posStore.cartId ?? null, 'tax-preview'] }),
  ])
}
registerProgressiveLoading(isRefreshing, t('pos.payment.updatingPayments'))

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
watch(() => pendingDeliveryOrder.value?.partial_payments, hydratePartialsFrom)
watch(() => selectedCustomer.value?.id, () => {
  if (isPendingDeliveryMode.value) return
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
  if (!isPendingDeliveryMode.value && posStore.cart.length > 0) {
    isSyncingCart.value = true
  }

  setRefreshHandler(refreshAll)

  // Cart sync is the only operation that's genuinely sequential (mutation
  // local → backend). All read queries already kicked off from setup.
  if (isPendingDeliveryMode.value) {
    posDebugLog('checkout', 'syncCart:skipped-pending-delivery')
    isSyncingCart.value = false
  } else {
    await syncCart()
    posDebugLog('checkout', 'mount:after-syncCart', checkoutDebugSnapshot())
  }
  unsubscribeWompiPayment = subscribeOrderPaymentApproved((payload) => {
    if (payload.order_id && payload.order_id === wompiOrderId.value) {
      void finishWompiSale()
    }
  })
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
  ([kitchen, kitchenFlag, tabCount], prev) => {
    if (!prev) return
    const [prevKitchen, prevKitchenFlag, prevTabCount] = prev
    if (kitchen === prevKitchen && kitchenFlag === prevKitchenFlag && tabCount === prevTabCount) return
    posDebugLog('checkout', 'mode:changed', {
      from: { kitchen: prevKitchen, kitchenFlag: prevKitchenFlag, tabCount: prevTabCount },
      to: { kitchen, kitchenFlag, tabCount },
      ...checkoutDebugSnapshot(),
    })
  },
)

onUnmounted(() => {
  clearRefreshHandler(refreshAll)
  unsubscribeWompiPayment?.()
  unsubscribeWompiPayment = null
})

// Issue #529 — auto-select the anonymous customer when the tenant flag is on. Applies to
// counter, bar, AND mesa modes: the customer is only attached to orders at
// close time anyway, so pre-selecting the anonymous customer is safe and uniform across
// modes. Uses a watcher (not onMounted) because restaurant-context loads
// asynchronously and may still be undefined when checkout mounts on a fresh page load.
watch(
  () => posStore.currentCustomer,
  (customer) => {
    if (isPendingDeliveryMode.value) return
    if (!customer || selectedCustomer.value) return
    selectedCustomer.value = toPosCustomer(customer)
  },
  { immediate: true },
)

watch(
  pendingDeliveryOrder,
  (order) => {
    if (!order || !isPendingDeliveryMode.value) return
    if (order.customer?.id) {
      selectedCustomer.value = toPosCustomer(order.customer)
    }
    deliveryEnabled.value = true
    deliveryInstructions.value = order.delivery_instructions || ''
    if (order.delivery_address_id) {
      addressStore.selectAddress(order.delivery_address_id)
    }
  },
  { immediate: true },
)

const autoSelectAttempted = ref(false)
watch(
  () => posCheckoutBusiness.value,
  async (business) => {
    if (isPendingDeliveryMode.value) return
    if (autoSelectAttempted.value) return
    if (!posCheckoutContext.value) return                 // not loaded yet — wait
    if (!business.auto_select_generic_enabled) return     // tenant opted out
    if (selectedCustomer.value) return                    // already chosen — don't override
    autoSelectAttempted.value = true
    try {
      const res = await $fetch<{ success: boolean; data: PosCustomer }>(
        '/api/pos/customers/search-or-create',
        {
          method: 'POST',
          body: { phone_number: '0000000000', name: t('pos.checkout.customerNoData') },
        },
      )
      if (res.success) selectedCustomer.value = res.data
    } catch {
      // Silent fallback: cashier still has the modal button (no UX regression).
    }
  },
  { immediate: true },
)

watch(showSuccessModal, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
})

// Clear pending timers on unmount
onUnmounted(() => {
  if (estimateTimer) clearTimeout(estimateTimer)
  if (import.meta.client) document.body.style.overflow = ''
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
          {{ isSyncingCart ? t('pos.checkout.loadingPreparing') : t('pos.checkout.loadingCheckout') }}
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
      <h2 class="text-xl font-semibold text-text-primary mb-2">{{ t('pos.checkout.emptyTitle') }}</h2>
      <p class="text-text-secondary mb-6">{{ t('pos.checkout.emptyBody') }}</p>
      <UiButton variant="default" @click="backToPos">
        {{ t('pos.checkout.backToPos') }}
      </UiButton>
    </div>

    <!-- Main Grid (cart has items and sync completed) -->
    <div
      v-else
      class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      :class="{ 'pointer-events-none select-none': showSuccessModal }"
      :aria-hidden="showSuccessModal ? 'true' : undefined"
    >

      <!-- Live promotion hint — checkout header (warocol.com#983) -->
      <div
        v-if="hasActivePromos"
        role="status"
        :class="[checkoutAlertBannerClass, 'lg:col-span-12 bg-status-success-bg border border-status-success-text/25']"
      >
        <div class="flex-shrink-0 bg-status-success-text/15 p-1.5 rounded-lg">
          <svg class="h-[1em] w-[1em] text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <p class="text-sm text-status-success-text font-medium">
          {{ t('pos.checkout.promoActive', { name: activePromoHint }) }}
        </p>
      </div>

      <!-- LEFT COLUMN: Order Items & Payment Method -->
      <div class="lg:col-span-8 space-y-6">

        <!-- ACCORDION: Orden -->
        <div :class="checkoutSectionCardFlushClass">
          <button
            type="button"
            @click="activeAccordion = activeAccordion === 'order' ? null : 'order'"
            :class="[checkoutAccordionTriggerClass, 'justify-between bg-surface-secondary/50 hover:bg-surface-secondary/70']"
          >
            <span class="font-bold text-text-primary flex items-center gap-2 text-sm md:text-base">
                <svg class="h-[1em] w-[1em] text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              {{ t('pos.checkout.order') }}
              <span class="text-text-tertiary font-normal text-xs ms-1">({{ cartItems.length }})</span>
            </span>
            <svg
              class="h-[1em] w-[1em] text-text-tertiary flex-shrink-0 transition-transform duration-200"
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

                <p class="text-xs text-text-tertiary mt-0.5">{{ formatCurrency(item.product.price) }} {{ t('pos.cartItem.perUnit') }}</p>

                <!-- Modifiers -->
                <div v-if="item.modifiers && item.modifiers.length > 0" class="mt-0.5 space-y-0">
                  <p v-for="mod in item.modifiers" :key="mod.id" class="text-text-tertiary text-xs">
                    + {{ mod.name }}<template v-if="(mod.quantity ?? 1) > 1"> ×{{ mod.quantity ?? 1 }}</template> · {{ formatCurrency(modifierLineTotal(mod)) }}
                  </p>
                </div>

                <p
                  v-if="getLineTaxInfo(item)"
                  class="text-xs text-text-tertiary mt-0.5"
                >
                  {{ formatLineTaxDisplay(getLineTaxInfo(item)!) }}
                </p>

                <!-- Notes -->
                <p v-if="item.notes" class="text-xs text-text-tertiary italic mt-0.5">{{ item.notes }}</p>

                <label
                  v-if="lineShowsPromoToggle(item)"
                  :class="[
                    checkoutInlineRowClass,
                    'mt-2 cursor-pointer',
                    togglingPromoLineId === String(item.orderItemId ?? item.id ?? '') && 'opacity-60 pointer-events-none',
                  ]"
                >
                  <span class="text-xs font-medium text-text-primary">{{ t('pos.checkout.applyPromo') }}</span>
                  <span class="relative inline-flex items-center flex-shrink-0">
                    <input
                      type="checkbox"
                      class="sr-only peer"
                      :checked="!isLinePromoOptedOut(item)"
                      :disabled="togglingPromoLineId === String(item.orderItemId ?? item.id ?? '')"
                      @change="toggleLinePromoApply(item, ($event.target as HTMLInputElement).checked)"
                    />
                    <span class="block w-10 h-6 bg-control-toggle-track-off rounded-full peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Customer Identification -->
        <div :class="checkoutSectionCardClass">
          <h2 :class="checkoutSectionTitleClass">
            <svg class="h-[1em] w-[1em] text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            {{ t('pos.checkout.customerData') }}
          </h2>
          <p v-if="isPendingDeliveryMode" class="text-xs text-text-secondary mt-1 mb-3">
            {{ t('pos.checkout.deliveryCheckout.pendingCustomerLockedHint') }}
          </p>

          <!-- Customer selected: compact horizontal layout (#1999) -->
          <div v-if="selectedCustomer" class="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
              {{ selectedCustomer.name?.charAt(0)?.toUpperCase() || selectedCustomer.phone_number?.charAt(0) || '?' }}
            </div>
            <div class="flex-1 min-w-0 space-y-1">
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  {{ t('pos.receipt.saleContact') }}
                </p>
                <p class="font-semibold text-text-primary truncate leading-tight">{{ selectedCustomerDisplayName }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
                <span class="truncate">{{ selectedCustomer.phone_number || t('pos.checkout.noPhone') }}</span>
                <span v-if="selectedCustomer.email" class="truncate text-xs">{{ selectedCustomer.email }}</span>
                <span
                  v-if="selectedCustomer.fiscal_id && !selectedCustomerIdentity.showSeparateAcquirer"
                  class="inline-flex items-center gap-1 text-xs text-state-success-text truncate"
                >
                  <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  {{ t('pos.checkout.invoiceFiscalPrefix', { type: selectedCustomer.fiscal_id_type, id: selectedCustomer.fiscal_id }) }}
                </span>
                <span v-if="!isAnonymousCustomer" class="inline-flex" aria-live="polite">
                  <div
                    v-if="isWalletPending"
                    class="h-5 w-[6.5rem] rounded-full bg-surface-secondary animate-pulse"
                    :aria-label="t('pos.checkout.loadingWalletAria')"
                  />
                  <span
                    v-else
                    class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-state-success-bg text-state-success-text border border-state-success-border"
                  >
                    {{ t('pos.checkout.walletBalance', { amount: formatCurrency(walletBalanceCop) }) }}
                  </span>
                </span>
              </div>
              <div
                v-if="selectedCustomerIdentity.showSeparateAcquirer"
                class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pt-0.5 border-t border-primary/15"
              >
                <p class="text-[10px] font-bold uppercase tracking-wider text-state-warning-text">
                  {{ t('pos.receipt.fiscalAcquirer') }}
                </p>
                <p v-if="selectedCustomerIdentity.acquirer.name" class="text-xs font-semibold text-text-primary truncate">
                  {{ selectedCustomerIdentity.acquirer.name }}
                </p>
                <p v-if="selectedCustomerIdentity.acquirer.fiscalId" class="text-xs text-text-secondary truncate">
                  {{ [selectedCustomerIdentity.acquirer.fiscalIdType, selectedCustomerIdentity.acquirer.fiscalId].filter(Boolean).join(' ') }}
                </p>
                <p v-if="selectedCustomerIdentity.acquirer.email" class="text-xs text-text-secondary truncate">
                  {{ selectedCustomerIdentity.acquirer.email }}
                </p>
              </div>
            </div>
            <button
              v-if="!isPendingDeliveryMode"
              @click="showCustomerModal = true"
              class="min-h-[44px] min-w-[44px] px-3 py-2 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0 self-center"
            >
              {{ t('pos.checkout.changeCustomer') }}
            </button>
          </div>

          <!-- No customer yet: open modal button -->
          <button
            v-else-if="!isPendingDeliveryMode"
            @click="showCustomerModal = true"
            :class="[checkoutControlHeightClass, 'w-full flex items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all']"
          >
            <svg class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <span class="font-medium">{{ t('pos.checkout.identifyCustomer') }}</span>
          </button>
        </div>

        <!-- Section: Payment Method -->
        <div :class="checkoutSectionCardClass">
          <h2 :class="checkoutSectionTitleClass">
            <svg class="h-[1em] w-[1em] text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
            {{ t('pos.checkout.paymentMethod') }}
          </h2>

          <!-- Skeleton while loading payment methods -->
          <div v-if="isLoadingPaymentMethods" class="space-y-2">
            <div class="h-11 rounded-xl border border-border bg-border/40 animate-pulse" />
            <div class="h-[11.5rem] rounded-xl border border-border bg-border/20 animate-pulse" />
          </div>

          <div v-else class="space-y-3">
            <button
              v-if="canDeferDeliveryPayment"
              type="button"
              @click="deferDeliveryPayment"
              :class="[
                checkoutControlHeightClass,
                'w-full flex items-center gap-3 rounded-xl border px-4 py-3 theme-transition active:scale-[0.99]',
                isDeferredDeliveryPayment
                  ? 'border-status-warning-text/50 bg-status-warning-bg text-status-warning-text shadow-sm'
                  : 'border-border text-text-secondary hover:border-status-warning-text/40 hover:text-text-primary',
              ]"
            >
              <div class="bg-status-warning-bg text-status-warning-text w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l3 2.25m6-2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <span class="font-semibold text-sm">{{ t('pos.checkout.payOnDelivery') }}</span>
              <svg
                v-if="isDeferredDeliveryPayment"
                class="h-5 w-5 ms-auto text-status-warning-text"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </button>

            <PaymentsPaymentMethodSelector
              v-model="checkoutPaymentSelection"
              :groups="checkoutVisiblePaymentGroups"
              layout="search"
              :disabled="isProcessing"
            />
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

          <!-- Credit due date (optional) — shown only when a triggersCartera group is selected -->
          <div v-if="selectedGroup?.triggersCartera && selectedCustomer && !isAnonymousCustomer" class="mt-3 p-3 bg-state-warning-bg  border border-state-warning-border  rounded-xl">
            <label class="block text-xs font-semibold text-state-warning-text  mb-1.5">
              {{ t('pos.checkout.paymentDueOptional') }} <span class="font-normal text-state-warning-text">{{ t('pos.checkout.optional') }}</span>
            </label>
            <input
              v-model="creditDueDate"
              type="date"
              class="w-full h-9 px-3 rounded-lg border border-state-warning-border  bg-white  text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-state-warning-border"
            />
          </div>
        </div>

        <!-- Section: Descuento -->
        <div :class="checkoutSectionCardClass">
          <!-- Header with toggle -->
          <div class="flex items-center justify-between">
            <h2 :class="checkoutSectionTitleClass">
              <svg class="h-[1em] w-[1em] text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              {{ t('pos.checkout.discount.title') }}
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
                {{ t('pos.checkout.discount.fixed') }}
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
                :placeholder="discountType === 'percent' ? t('pos.checkout.discount.percentPlaceholder') : t('pos.checkout.discount.fixedPlaceholder')"
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
                {{ t('pos.checkout.discount.baseAvailable', { amount: formatCurrency(subtotalAfterPromos) }) }}
              </p>
              <button
                v-if="discountInput"
                type="button"
                @click="clearManualDiscount"
                class="text-xs font-semibold text-text-secondary hover:text-primary"
              >
                {{ t('pos.checkout.discount.clear') }}
              </button>
            </div>

            <!-- Live preview -->
            <div v-if="discountAmount > 0" class="flex items-center justify-between px-4 py-2.5 bg-primary/10 rounded-lg">
              <span class="text-sm font-medium text-primary">{{ t('pos.checkout.discount.applied') }}</span>
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
              :aria-label="t('pos.checkout.tipTax.aria')"
            />
            <span class="text-sm text-text-primary leading-snug">
              {{ t('pos.checkout.tipTax.title') }}
              <span class="block text-xs text-text-secondary mt-0.5">
                {{ t('pos.checkout.tipTax.body', { tax: tipTaxLabel.toLowerCase() }) }}
              </span>
            </span>
          </label>
          <p v-if="tipTaxable && tipTaxAmount > 0" class="text-xs text-text-secondary tabular-nums ps-7">
            {{ tipTaxLabel }}: {{ formatCurrency(tipTaxAmount) }}
          </p>
        </div>

        <!-- Section: Domicilio pendiente (solo lectura — fijado al diferir) -->
        <div
          v-if="isPendingDeliveryMode"
          :class="checkoutSectionCardClass"
        >
          <h2 :class="checkoutSectionTitleClass">
            <svg class="h-[1em] w-[1em] text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
              <path d="M15 18H9" />
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
              <circle cx="17" cy="18" r="2" />
              <circle cx="7" cy="18" r="2" />
            </svg>
            {{ t('pos.checkout.deliveryCheckout.title') }}
          </h2>
          <p class="text-xs text-text-secondary mt-2">
            {{ t('pos.checkout.deliveryCheckout.pendingLockedHint') }}
          </p>
          <dl class="mt-4 space-y-3 text-sm">
            <div v-if="pendingDeliveryAddressLabel">
              <dt class="text-xs font-medium text-text-secondary">
                {{ t('pos.checkout.deliveryCheckout.pendingAddressLabel') }}
              </dt>
              <dd class="text-text-primary mt-0.5">{{ pendingDeliveryAddressLabel }}</dd>
            </div>
            <div v-if="pendingDeliveryOrder?.delivery_instructions">
              <dt class="text-xs font-medium text-text-secondary">
                {{ t('pos.checkout.deliveryCheckout.pendingInstructionsLabel') }}
              </dt>
              <dd class="text-text-primary mt-0.5 whitespace-pre-wrap">
                {{ pendingDeliveryOrder.delivery_instructions }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Section: Domicilio (mostrador or bar — never mesa) -->
        <div v-else-if="canRegisterDelivery" :class="checkoutSectionCardClass">
          <div class="flex items-center justify-between gap-3">
            <h2 :class="checkoutSectionTitleClass">
              <svg class="h-[1em] w-[1em] text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                <path d="M15 18H9" />
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                <circle cx="17" cy="18" r="2" />
                <circle cx="7" cy="18" r="2" />
              </svg>
              {{ t('pos.checkout.deliveryCheckout.title') }}
            </h2>
            <label
              class="relative inline-flex items-center"
              :class="isDeliveryEligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
            >
              <input
                v-model="deliveryEnabled"
                type="checkbox"
                class="sr-only peer"
                :disabled="!isDeliveryEligible || isPendingDeliveryMode"
                :aria-label="t('pos.checkout.deliveryCheckout.toggleAria')"
              />
              <div class="w-11 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <!-- Helper messages — explain why the toggle is disabled -->
          <p v-if="!acceptsOnlineOrders" class="text-xs text-text-secondary mt-2">
            {{ t('pos.checkout.deliveryCheckout.enableOnlineOrders') }}
          </p>
          <p v-else-if="!selectedCustomer" class="text-xs text-text-secondary mt-2">
            {{ t('pos.checkout.deliveryCheckout.selectCustomer') }}
          </p>
          <p v-else-if="isAnonymousCustomer" class="text-xs text-text-secondary mt-2">
            {{ t('pos.checkout.deliveryCheckout.identifyRealCustomer') }}
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
                  {{ t('pos.checkout.deliveryCheckout.courierNotes') }} {{ t('pos.checkout.optional') }}
                </label>
                <textarea
                  id="pos-delivery-instructions"
                  v-model="deliveryInstructions"
                  rows="3"
                  maxlength="500"
                  :placeholder="t('pos.checkout.deliveryCheckout.courierNotesPlaceholder')"
                  class="input-base w-full px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
          </Transition>
        </div>

        <!-- Customer Search Modal -->
        <PosCustomerIdentificationModal
          v-if="!isPendingDeliveryMode"
          v-model="showCustomerModal"
          @customer-identified="onCustomerIdentified"
          @fiscal-updated="onCustomerIdentified"
        />
        <WompiCollectionSlideover
          v-model="showWompiSlideover"
          :order-id="wompiOrderId"
          :amount="wompiAmount"
          :customer-id="selectedCustomer?.id"
          :email="selectedCustomer?.email"
          @approved="() => { void finishWompiSale() }"
          @error="(message) => { processingError = message }"
        />

      </div>

      <!-- RIGHT COLUMN: Accordion (Desktop Only) -->
      <div class="hidden lg:block lg:col-span-4 lg:sticky lg:top-8 space-y-3">

        <!-- ACCORDION 1: Customer Insights (loading or has history) -->
        <div
          v-if="insightsLoading || (customerInsights && customerInsights.orders_count > 0)"
          :class="checkoutSectionCardFlushClass"
        >
          <!-- Trigger -->
          <button
            @click="activeAccordion = activeAccordion === 'insights' ? null : 'insights'"
            :class="checkoutAccordionTriggerClass"
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
              class="h-[1em] w-[1em] text-text-tertiary flex-shrink-0 transition-transform duration-200"
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
        <div :class="checkoutSectionCardFlushClass">
          <!-- Trigger -->
          <button
            @click="activeAccordion = activeAccordion === 'summary' ? null : 'summary'"
            :class="[checkoutAccordionTriggerClass, 'justify-between']"
          >
	            <h3 class="font-bold text-text-primary">{{ t('pos.checkout.summary.title') }}</h3>
            <svg
              class="h-[1em] w-[1em] text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'summary' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>

          <!-- Body -->
          <div v-show="activeAccordion === 'summary'" class="border-t border-border px-4 py-4">
            <div class="space-y-3 mb-4">
              <div class="flex justify-between text-sm text-text-secondary">
	                <span>{{ t('pos.checkout.summary.subtotalProducts', { count: cartItems.length }) }}</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(cartTotal) }}</span>
              </div>
              <div v-if="promoSavings > 0 && displayPromoBreakdown.length === 0" class="flex justify-between text-sm text-state-success-text ">
	                <span>{{ t('pos.checkout.summary.promotion') }}</span>
                <span class="font-medium">- {{ formatCurrency(promoSavings) }}</span>
              </div>
              <div
                v-for="(promo, promoIdx) in displayPromoBreakdown"
                :key="promo.promotion_id ?? promo.promotion_name ?? promoIdx"
                class="flex justify-between text-xs text-state-success-text/90  ps-3"
              >
                <span>{{ promo.promotion_name }}</span>
                <span class="font-medium">- {{ formatCurrency(promo.savings) }}</span>
              </div>
              <div
                v-if="promoSavings > 0"
                class="flex justify-between text-sm text-text-secondary"
              >
	                <span>{{ t('pos.checkout.summary.subtotalWithPromo') }}</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(subtotalAfterPromos) }}</span>
              </div>
              <div v-if="discountEnabled && discountAmount > 0" class="flex justify-between text-sm text-primary">
	                <span>{{ t('pos.checkout.summary.manualDiscount') }}</span>
                <span class="font-medium">- {{ formatCurrency(discountAmount) }}</span>
              </div>
              <div
                v-else-if="persistedPendingOrderDiscount > 0"
                class="flex justify-between text-sm text-primary"
              >
                <span>{{ t('pos.checkout.summary.manualDiscount') }}</span>
                <span class="font-medium">- {{ formatCurrency(persistedPendingOrderDiscount) }}</span>
              </div>
              <div v-if="waroDiscountCop > 0" class="flex justify-between text-sm text-state-warning-text">
	                <span>{{ waroRewardLabel ? `WaRo: ${waroRewardLabel}` : t('pos.checkout.summary.waroRedeem') }}</span>
                <span class="font-medium">- {{ formatCurrency(waroDiscountCop) }}</span>
              </div>
              <div
                v-if="taxPreview && taxPreview.standard_tax > 0"
                class="flex justify-between text-sm text-text-secondary"
              >
                <span>{{ localizedInternalTaxLabel(taxPreview.standard_tax_label) }}</span>
                <span class="font-medium text-text-primary">
                  {{ formatCurrency(taxPreview.standard_tax) }}
                </span>
              </div>
              <div
                v-if="taxPreview && taxPreview.liquor_tax > 0"
                class="flex justify-between text-sm text-text-secondary"
              >
                <span>{{ taxPreview.liquor_tax_label || t('pos.receipt.liquorVat') }}</span>
                <span class="font-medium text-text-primary">
                  {{ formatCurrency(taxPreview.liquor_tax) }}
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
	                <span>{{ t('pos.checkout.summary.orderTotal') }}</span>
                <span class="font-medium text-text-primary tabular-nums">{{ formatCurrency(checkoutSummaryOrderTotal) }}</span>
              </div>
              <div
                v-if="checkoutSummaryAdvanceApplied > 0"
                class="flex justify-between text-sm text-state-success-text mb-2"
              >
	                <span>{{ t('pos.checkout.summary.tableAdvance') }}</span>
                <span class="font-medium tabular-nums">- {{ formatCurrency(checkoutSummaryAdvanceApplied) }}</span>
              </div>
              <div class="flex justify-between items-end mb-1">
	                <span class="text-text-secondary font-medium">{{ t('pos.checkout.summary.totalToPay') }}</span>
                <span class="text-3xl font-bold text-primary tabular-nums">{{ formatCurrency(checkoutSummaryAmountDue) }}</span>
              </div>
              <p class="text-end text-xs text-text-tertiary">{{ currencyCode }}</p>
            </div>
          </div>
        </div>

        <!-- WAROS CARD (desktop) — accordion -->
        <div
          v-if="warosPanelVisible"
          :class="checkoutSectionCardFlushClass"
        >
          <button
            @click="activeAccordion = activeAccordion === 'waros' ? null : 'waros'"
            :class="checkoutAccordionTriggerClass"
          >
            <svg class="h-[1em] w-[1em] text-state-warning-icon flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
            </svg>
            <span class="font-semibold text-sm text-text-primary">Waros</span>
            <span v-if="!isLoadingWaros" class="ms-auto text-sm font-bold tabular-nums text-state-warning-text">
              {{ warosBalance.toLocaleString(uiLocale) }}
            </span>
            <svg
              class="h-[1em] w-[1em] text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'waros' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <div v-show="activeAccordion === 'waros'" class="border-t border-border px-4 py-4 space-y-4">
            <div v-if="isLoadingWaros || isWalletPending" :class="checkoutStatGridClass">
              <div v-for="i in 3" :key="i" class="animate-pulse bg-surface-secondary rounded-lg min-h-[3rem]" />
            </div>
            <div v-else :class="checkoutStatGridClass">
              <div :class="checkoutStatCardClass">
                <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{{ t('pos.wallet.points') }}</p>
                <p class="text-sm font-bold tabular-nums text-text-primary leading-tight mt-0.5">
                  {{ warosBalance.toLocaleString(uiLocale) }}
                </p>
              </div>
              <div :class="checkoutStatCardClass">
                <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Wallet</p>
                <p class="text-sm font-bold tabular-nums text-text-primary leading-tight mt-0.5">
                  {{ formatCurrency(walletBalanceCop) }}
                </p>
              </div>
              <div v-if="warosEarnBlockVisible" :class="checkoutStatCardClass">
                <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{{ t('pos.wallet.earn') }}</p>
                <p class="text-sm font-bold tabular-nums leading-tight mt-0.5" :class="warosEarnEligible ? 'text-state-success-text' : 'text-text-tertiary'">
                  <span v-if="isLoadingEstimate" class="inline-block h-4 w-8 rounded bg-surface-secondary animate-pulse" />
                  <span v-else-if="!warosEarnEligible">—</span>
                  <span v-else-if="estimatedWaros === null">—</span>
                  <span v-else>+{{ estimatedWaros.toLocaleString(uiLocale) }}</span>
                </p>
              </div>
            </div>

            <template v-if="waroRedemptionEnabled">
              <div class="space-y-3">
                <p
                  v-if="isLoadingWaroPreview && !waroPreview && selectedWaroReward"
                  class="text-xs text-text-tertiary animate-pulse"
                >
                  {{ t('pos.wallet.calculatingRedemption') }}
                </p>

                <ul v-if="activeWaroRewards.length" class="space-y-1.5">
                  <li v-for="reward in activeWaroRewards" :key="reward.id">
                    <label
                      :class="[
                        checkoutInlineRowClass,
                        warosBalance >= reward.waros_cost ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                      ]"
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
                          <span class="block w-10 h-6 bg-control-toggle-track-off rounded-full peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
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
        <PosCheckoutSplitPaymentPanel
          v-if="selectedCustomer"
          v-model:cash-received-input="cashReceivedInput"
          cash-input-id="cash-received-input"
          :split-mode="splitMode"
          :split-payments="splitPayments"
          :split-paid-total="splitPaidTotal"
          :split-is-complete="splitIsComplete"
          :split-remaining="splitRemaining"
          :split-amount-due="splitAmountDue"
          :split-partial-amount="splitPartialAmount"
          :split-amount-validation-message="splitAmountValidationMessage"
          :split-payment-validation-message="splitPaymentValidationMessage"
          :tip-amount="tipAmount"
          :tip-tax-amount="tipTaxAmount"
          :tip-tax-label="tipTaxLabel"
          :discounted-total="discountedTotal"
          :is-voiding-payment="isVoidingPayment"
          :is-cash-method="isCashMethod"
          :cash-amount-to-charge="cashAmountToCharge"
          :is-adding-payment="isAddingPayment"
          :selected-payment-method="selectedPaymentMethod"
          :requires-method-selection="requiresMethodSelection"
          :split-amount-to-charge="splitAmountToCharge"
          :can-add-split-payment="canAddSplitPayment"
          :get-payment-method-label="getPaymentMethodLabel"
          @toggle-split-mode="toggleSplitMode"
          @split-amount-input="onSplitAmountInput"
          @add-split-payment="addSplitPayment"
          @void-payment="openVoidPaymentModal"
        />

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
          v-if="showKitchenSendOnChargeBanner"
          role="status"
          :class="[checkoutAlertBannerClass, 'bg-state-warning-bg border border-state-warning-border']"
        >
          <div class="flex-shrink-0 bg-state-warning-bg p-1.5 rounded-lg">
            <svg class="h-[1em] w-[1em] text-state-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
            </svg>
          </div>
	          <p class="text-sm text-state-warning-text font-medium">{{ t('pos.checkout.kitchenSendOnCharge') }}</p>
        </div>

        <!-- Action Buttons (always visible) -->
        <div class="flex flex-col gap-2">
          <button
            @click="processOrder"
            v-if="!splitMode"
            :disabled="isProcessing || showWompiSlideover || !selectedCustomer || isLoadingEstimate || requiresMethodSelection || !cashIsValid || !manualDiscountIsValid || !!walletTenderValidationMessage"
            class="w-full bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UiLoadingDots v-if="isProcessing" size="9px" />
            <svg v-else class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span v-if="!isProcessing">
              {{ isDeferredDeliveryPayment
	                ? t('pos.checkout.actions.leavePending')
	                : selectedPaymentMethod === 'credit'
	                ? t('pos.checkout.actions.registerCredit')
	                : tipAmount > 0 || mesaAdvanceAppliedEstimate > 0
	                  ? t('pos.checkout.actions.confirmWithAmount', { amount: formatCurrency(finalAmountToCollect) })
	                  : t('pos.checkout.actions.confirmOrder') }}
            </span>
            <svg v-if="!isProcessing" class="h-[1em] w-[1em] opacity-0 -ms-4 group-hover:opacity-100 group-hover:ms-0 transition-all" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
	          <p v-if="!selectedCustomer && !isProcessing" class="text-center text-xs text-text-tertiary">{{ t('pos.checkout.actions.identifyCustomerToContinue') }}</p>

          <!-- Issue #535 — Imprimir prefactura (pre-cuenta para revisión del cliente) -->
          <button
            v-if="cartItems.length > 0"
            type="button"
            :disabled="prefacturaDisabled"
	            :title="prefacturaDisabled ? t('pos.checkout.actions.printPrefacturaTitleLoading') : t('pos.checkout.actions.printPrefacturaTitle')"
            @click="printPrefactura"
            class="w-full bg-surface border-2 border-border hover:border-primary hover:text-primary text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
	            :aria-label="t('pos.checkout.actions.printPrefacturaAria')"
          >
            <svg class="h-[1em] w-[1em]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0H6.34m11.318 0a23.97 23.97 0 01-3.42-1.5m3.42 1.5l.42-.5m-3.84 1.5a23.97 23.97 0 003.42-1.5M14.25 9.75v.01m-3-.01v.01m-3-.01v.01M7.5 6.75h9a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75z" />
            </svg>
	            <span>{{ t('pos.checkout.actions.printPrefactura') }}</span>
          </button>

          <button
            @click="cancelOrder"
            class="w-full bg-surface border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
	            {{ t('pos.checkout.actions.cancel') }}
          </button>
        </div>

        <!-- Security Note -->
        <div class="flex items-center justify-center gap-2 text-xs text-text-tertiary">
          <svg class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
	          <span>{{ t('pos.checkout.secureTransaction') }}</span>
        </div>

      </div>

    </div>

    <!-- Mobile Bottom Summary -->
    <div
      v-if="cartItems.length > 0 && !isSyncingCart && !syncError"
      class="lg:hidden mt-6 pb-4 space-y-3"
      :class="{ 'pointer-events-none select-none': showSuccessModal }"
      :aria-hidden="showSuccessModal ? 'true' : undefined"
    >
      <!-- Live promotion hint — checkout footer (warocol.com#983) -->
      <div
        v-if="hasActivePromos"
        role="status"
        :class="[checkoutAlertBannerClass, 'bg-status-success-bg border border-status-success-text/25']"
      >
        <div class="flex-shrink-0 bg-status-success-text/15 p-1.5 rounded-lg">
          <svg class="h-[1em] w-[1em] text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <p class="text-sm text-status-success-text font-medium">
          {{ t('pos.checkout.promoActive', { name: activePromoHint }) }}
        </p>
      </div>

      <!-- ACCORDION: Customer Insights (same as desktop) -->
      <div
        v-if="insightsLoading || (customerInsights && customerInsights.orders_count > 0)"
        :class="checkoutSectionCardFlushClass"
      >
        <button
          @click="activeAccordion = activeAccordion === 'insights' ? null : 'insights'"
          :class="checkoutAccordionTriggerClass"
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
            class="h-[1em] w-[1em] text-text-tertiary flex-shrink-0 transition-transform duration-200"
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
      <div :class="checkoutSectionCardFlushClass">
        <button
          @click="activeAccordion = activeAccordion === 'summary' ? null : 'summary'"
          :class="[checkoutAccordionTriggerClass, 'justify-between']"
        >
	          <h3 class="font-bold text-text-primary">{{ t('pos.checkout.summary.title') }}</h3>
          <svg
            class="h-[1em] w-[1em] text-text-tertiary flex-shrink-0 transition-transform duration-200"
            :class="activeAccordion === 'summary' ? 'rotate-0' : 'rotate-180'"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <div v-show="activeAccordion === 'summary'" class="border-t border-border px-4 py-4">
          <div class="space-y-3 mb-4">
            <div class="flex justify-between text-sm text-text-secondary">
	              <span>{{ t('pos.checkout.summary.subtotalProducts', { count: cartItems.length }) }}</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(cartTotal) }}</span>
            </div>
            <div v-if="promoSavings > 0 && displayPromoBreakdown.length === 0" class="flex justify-between text-sm text-state-success-text ">
	              <span>{{ t('pos.checkout.summary.promotion') }}</span>
              <span class="font-medium">- {{ formatCurrency(promoSavings) }}</span>
            </div>
            <div
              v-for="(promo, promoIdx) in displayPromoBreakdown"
              :key="promo.promotion_id ?? promo.promotion_name ?? promoIdx"
              class="flex justify-between text-xs text-state-success-text/90  ps-3"
            >
              <span>{{ promo.promotion_name }}</span>
              <span class="font-medium">- {{ formatCurrency(promo.savings) }}</span>
            </div>
            <div
              v-if="promoSavings > 0"
              class="flex justify-between text-sm text-text-secondary"
            >
	              <span>{{ t('pos.checkout.summary.subtotalWithPromo') }}</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(subtotalAfterPromos) }}</span>
            </div>
            <div v-if="discountEnabled && discountAmount > 0" class="flex justify-between text-sm text-state-success-text ">
	              <span>{{ t('pos.checkout.summary.manualDiscount') }}</span>
              <span class="font-medium">- {{ formatCurrency(discountAmount) }}</span>
            </div>
            <div
              v-else-if="persistedPendingOrderDiscount > 0"
              class="flex justify-between text-sm text-primary"
            >
              <span>{{ t('pos.checkout.summary.manualDiscount') }}</span>
              <span class="font-medium">- {{ formatCurrency(persistedPendingOrderDiscount) }}</span>
            </div>
            <div v-if="waroDiscountCop > 0" class="flex justify-between text-sm text-state-warning-text">
	              <span>{{ waroRewardLabel ? `WaRo: ${waroRewardLabel}` : t('pos.checkout.summary.waroRedeem') }}</span>
              <span class="font-medium">- {{ formatCurrency(waroDiscountCop) }}</span>
            </div>
            <div
              v-if="taxPreview && taxPreview.standard_tax > 0"
              class="flex justify-between text-sm text-text-secondary"
            >
              <span>{{ localizedInternalTaxLabel(taxPreview.standard_tax_label) }}</span>
              <span class="font-medium text-text-primary">
                {{ formatCurrency(taxPreview.standard_tax) }}
              </span>
            </div>
            <div
              v-if="taxPreview && taxPreview.liquor_tax > 0"
              class="flex justify-between text-sm text-text-secondary"
            >
              <span>{{ taxPreview.liquor_tax_label || t('pos.receipt.liquorVat') }}</span>
              <span class="font-medium text-text-primary">
                {{ formatCurrency(taxPreview.liquor_tax) }}
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
	              <span>{{ t('pos.checkout.summary.orderTotal') }}</span>
              <span class="font-medium text-text-primary tabular-nums">{{ formatCurrency(checkoutSummaryOrderTotal) }}</span>
            </div>
            <div
              v-if="checkoutSummaryAdvanceApplied > 0"
              class="flex justify-between text-sm text-state-success-text mb-2"
            >
	              <span>{{ t('pos.checkout.summary.tableAdvance') }}</span>
              <span class="font-medium tabular-nums">- {{ formatCurrency(checkoutSummaryAdvanceApplied) }}</span>
            </div>
            <div class="flex justify-between items-end mb-1">
	              <span class="text-text-secondary font-medium">{{ t('pos.checkout.summary.totalToPay') }}</span>
              <span class="text-3xl font-bold text-primary tabular-nums">{{ formatCurrency(checkoutSummaryAmountDue) }}</span>
            </div>
            <p class="text-end text-xs text-text-tertiary">{{ currencyCode }}</p>
          </div>
        </div>
      </div>

      <!-- WAROS CARD (mobile) -->
      <div
        v-if="warosPanelVisible"
        :class="checkoutSectionCardFlushClass"
      >
        <div class="px-4 py-4 space-y-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold text-text-primary text-sm">Waros</h3>
            <span v-if="!isLoadingWaros" class="text-sm font-bold tabular-nums text-state-warning-text">
              {{ warosBalance.toLocaleString(uiLocale) }}
            </span>
          </div>
          <div v-if="isLoadingWaros || isWalletPending" :class="checkoutStatGridClass">
            <div v-for="i in 3" :key="i" class="animate-pulse bg-surface-secondary rounded-lg min-h-[3rem]" />
          </div>
          <div v-else :class="checkoutStatGridClass">
            <div :class="checkoutStatCardClass">
              <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{{ t('pos.wallet.points') }}</p>
              <p class="text-sm font-bold tabular-nums text-text-primary leading-tight mt-0.5">
                {{ warosBalance.toLocaleString(uiLocale) }}
              </p>
            </div>
            <div :class="checkoutStatCardClass">
              <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Wallet</p>
              <p class="text-sm font-bold tabular-nums text-text-primary leading-tight mt-0.5">
                {{ formatCurrency(walletBalanceCop) }}
              </p>
            </div>
            <div v-if="warosEarnBlockVisible" :class="checkoutStatCardClass">
              <p class="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{{ t('pos.wallet.earn') }}</p>
              <p class="text-sm font-bold tabular-nums leading-tight mt-0.5" :class="warosEarnEligible ? 'text-state-success-text' : 'text-text-tertiary'">
                <span v-if="isLoadingEstimate" class="inline-block h-4 w-8 rounded bg-surface-secondary animate-pulse" />
                <span v-else-if="!warosEarnEligible">—</span>
                <span v-else-if="estimatedWaros === null">—</span>
                <span v-else>+{{ estimatedWaros.toLocaleString(uiLocale) }}</span>
              </p>
            </div>
          </div>
          <template v-if="waroRedemptionEnabled">
            <div class="space-y-3">
              <p v-if="isLoadingWaroPreview && !waroPreview && selectedWaroReward" class="text-xs text-text-tertiary animate-pulse">
                {{ t('pos.wallet.calculatingRedemption') }}
              </p>
              <ul v-if="activeWaroRewards.length" class="space-y-1.5">
                <li v-for="reward in activeWaroRewards" :key="reward.id">
                  <label
                    :class="[
                      checkoutInlineRowClass,
                      warosBalance >= reward.waros_cost ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                    ]"
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
                        <span class="block w-10 h-6 bg-control-toggle-track-off rounded-full peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
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

      <PosCheckoutSplitPaymentPanel
        v-if="selectedCustomer"
        v-model:cash-received-input="cashReceivedInput"
        cash-input-id="cash-received-input-mobile-split"
        :split-mode="splitMode"
        :split-payments="splitPayments"
        :split-paid-total="splitPaidTotal"
        :split-is-complete="splitIsComplete"
        :split-remaining="splitRemaining"
        :split-amount-due="splitAmountDue"
        :split-partial-amount="splitPartialAmount"
        :split-amount-validation-message="splitAmountValidationMessage"
        :split-payment-validation-message="splitPaymentValidationMessage"
        :tip-amount="tipAmount"
        :tip-tax-amount="tipTaxAmount"
        :tip-tax-label="tipTaxLabel"
        :discounted-total="discountedTotal"
        :is-voiding-payment="isVoidingPayment"
        :is-cash-method="isCashMethod"
        :cash-amount-to-charge="cashAmountToCharge"
        :is-adding-payment="isAddingPayment"
        :selected-payment-method="selectedPaymentMethod"
        :requires-method-selection="requiresMethodSelection"
        :split-amount-to-charge="splitAmountToCharge"
        :can-add-split-payment="canAddSplitPayment"
        :get-payment-method-label="getPaymentMethodLabel"
        @toggle-split-mode="toggleSplitMode"
        @split-amount-input="onSplitAmountInput"
        @add-split-payment="addSplitPayment"
        @void-payment="openVoidPaymentModal"
      />

      <!-- Error Message -->
      <div v-if="processingError" class="bg-state-danger-bg  border-2 border-state-danger-border  rounded-xl p-4">
        <div class="flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <p class="text-sm text-state-danger-text ">{{ processingError }}</p>
        </div>
      </div>

      <!-- Pre-checkout banner: items will fire to kitchen on checkout (counter mode only) -->
      <div
        v-if="showKitchenSendOnChargeBanner"
        role="status"
        :class="[checkoutAlertBannerClass, 'bg-state-warning-bg border border-state-warning-border']"
      >
        <div class="flex-shrink-0 bg-state-warning-bg p-1.5 rounded-lg">
          <svg class="h-[1em] w-[1em] text-state-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
          </svg>
        </div>
	        <p class="text-sm text-state-warning-text font-medium">{{ t('pos.checkout.kitchenSendOnCharge') }}</p>
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
          :disabled="isProcessing || showWompiSlideover || !selectedCustomer || isLoadingEstimate || requiresMethodSelection || !cashIsValid || !manualDiscountIsValid || !!walletTenderValidationMessage"
          class="w-full bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UiLoadingDots v-if="isProcessing" size="9px" />
          <svg v-else class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span v-if="!isProcessing">
            {{ isDeferredDeliveryPayment ? t('pos.checkout.actions.leavePending') : selectedPaymentMethod === 'credit' ? t('pos.checkout.actions.registerCredit') : t('pos.checkout.actions.confirmOrder') }}
          </span>
        </button>
        <p v-if="!selectedCustomer && !isProcessing" class="text-center text-xs text-text-tertiary">{{ t('pos.checkout.actions.identifyCustomerToContinue') }}</p>

        <!-- Issue #535 — Imprimir prefactura (pre-cuenta para revisión del cliente) -->
        <button
          v-if="cartItems.length > 0"
          type="button"
          :disabled="prefacturaDisabled"
	          :title="prefacturaDisabled ? t('pos.checkout.actions.printPrefacturaTitleLoading') : t('pos.checkout.actions.printPrefacturaTitle')"
          @click="printPrefactura"
          class="w-full bg-surface border-2 border-border hover:border-primary hover:text-primary text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
	          :aria-label="t('pos.checkout.actions.printPrefacturaAria')"
        >
          <svg class="h-[1em] w-[1em]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0H6.34m11.318 0a23.97 23.97 0 01-3.42-1.5m3.42 1.5l.42-.5m-3.84 1.5a23.97 23.97 0 003.42-1.5M14.25 9.75v.01m-3-.01v.01m-3-.01v.01M7.5 6.75h9a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75z" />
          </svg>
	          <span>{{ t('pos.checkout.actions.printPrefactura') }}</span>
        </button>

	        <button
	          @click="cancelOrder"
	          class="w-full bg-surface border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
	        >
	          {{ t('pos.checkout.actions.cancel') }}
	        </button>
      </div>

      <!-- Security Note -->
      <div class="flex items-center justify-center gap-2 text-xs text-text-tertiary">
        <svg class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
	        <span>{{ t('pos.checkout.secureTransaction') }}</span>
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
            <svg class="h-[1em] w-[1em] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ t('pos.checkout.split.cashRefundWarning') }}</span>
          </p>

          <label for="void-payment-reason" class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
            {{ t('pos.checkout.split.reason') }} <span class="text-text-tertiary normal-case">{{ t('pos.checkout.optional') }}</span>
          </label>
          <textarea
            id="void-payment-reason"
            v-model="voidPaymentReason"
            rows="2"
            :disabled="isVoidingPayment === voidPaymentTarget.id"
            :placeholder="t('pos.checkout.split.reasonPlaceholder')"
            class="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 disabled:opacity-50"
          />

          <p v-if="voidPaymentError" class="mt-3 text-sm text-destructive flex items-start gap-2">
            <svg class="h-[1em] w-[1em] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
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
            >{{ t('pos.checkout.actions.cancel') }}</button>
            <button
              type="button"
              :disabled="isVoidingPayment === voidPaymentTarget.id"
              @click="confirmVoidPayment"
              class="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-action-destructive-bg text-action-destructive-text text-sm font-semibold hover:bg-action-destructive-hover-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <UiLoadingDots v-if="isVoidingPayment === voidPaymentTarget.id" size="8px" />
              <span v-else>{{ t('pos.checkout.split.deletePayment') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showSuccessModal"
          class="fixed inset-0 z-50 bg-overlay-backdrop/40"
          aria-hidden="true"
        />
      </Transition>

      <Transition name="checkout-success-panel">
        <div
          v-if="showSuccessModal"
          role="dialog"
          aria-modal="true"
          :aria-label="orderResult?.status === 'pending'
            ? t('pos.checkout.success.pendingTitle')
            : orderResult?.payment_method === 'credit'
              ? t('pos.checkout.success.creditTitle')
              : t('pos.checkout.success.completedTitle')"
          class="fixed z-[51] flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto
                 md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full
                 md:border-s md:border-border"
          @click.stop
        >
          <!-- Mobile drag handle -->
          <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden="true">
            <div class="w-10 h-1 rounded-full bg-sheet-border" />
          </div>

          <!-- Header (bodega StockAdjustmentPanel aesthetic #2008) -->
          <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div
                  class="flex-shrink-0 w-10 h-10 rounded-xl bg-state-success-bg flex items-center justify-center text-state-success-text"
                  aria-hidden="true"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h3 class="text-base font-bold leading-tight text-text-primary">
                    {{
                      orderResult?.status === 'pending'
                        ? t('pos.checkout.success.pendingTitle')
                        : orderResult?.payment_method === 'credit'
                          ? t('pos.checkout.success.creditTitle')
                          : t('pos.checkout.success.completedTitle')
                    }}
                  </h3>
                  <p class="text-xs leading-snug text-text-secondary mt-0.5">
                    {{
                      orderResult?.status === 'pending'
                        ? t('pos.checkout.success.pendingBody')
                        : orderResult?.payment_method === 'credit'
                          ? t('pos.checkout.success.creditBody')
                          : t('pos.checkout.success.completedBody')
                    }}
                  </p>
                </div>
              </div>
              <!-- Close is an explicit panel action (backdrop does not dismiss #2008) -->
              <button
                type="button"
                class="flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 transition-colors"
                :aria-label="t('pos.comandasPanel.closePanelAria')"
                @click="closeSuccessModal"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          <!-- Credit notice banner -->
          <div v-if="orderResult?.payment_method === 'credit'" class="mb-3 rounded-lg border border-state-warning-border/70 bg-state-warning-bg/70 px-3 py-2.5">
            <div class="flex items-center gap-2">
              <svg class="h-[1em] w-[1em] text-state-warning-text flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p class="text-xs font-medium leading-snug text-state-warning-text">{{ t('pos.checkout.success.creditNotice') }}</p>
            </div>
          </div>

          <!-- Order Details -->
          <div v-if="orderResult" class="bg-background rounded-lg border border-border p-3 mb-4 space-y-2.5">
            <div v-if="(orderResult?.order_number ?? 0) > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('pos.checkout.success.orderNumber') }}</span>
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
              <span class="text-sm text-primary">{{ t('pos.checkout.summary.manualDiscount') }}</span>
              <span class="text-sm font-medium text-primary">-{{ formatCurrency(orderResult.discount_amount) }}</span>
            </div>
            <div v-if="orderResultWaroDiscountCop > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-state-warning-text">{{ orderResultWaroLineLabel }}</span>
              <span class="text-sm font-medium text-state-warning-text">-{{ formatCurrency(orderResultWaroDiscountCop) }}</span>
            </div>
            <div v-if="orderResult.standard_tax && orderResult.standard_tax > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ localizedInternalTaxLabel(orderResult.standard_tax_label) }}</span>
              <span class="text-sm font-medium text-text-primary">{{ formatCurrency(orderResult.standard_tax) }}</span>
            </div>
            <div v-if="orderResult.liquor_tax && orderResult.liquor_tax > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ localizedInternalTaxLabel(orderResult.liquor_tax_label) || t('pos.receipt.liquorVat') }}</span>
              <span class="text-sm font-medium text-text-primary">{{ formatCurrency(orderResult.liquor_tax) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3" :class="(orderResult.discount_amount || orderResult.waro_discount_cop || orderResult.standard_tax || orderResult.liquor_tax) ? 'border-t border-border pt-2.5' : ''">
              <span class="text-sm text-text-secondary">{{ t('pos.checkout.summary.total') }}</span>
              <span class="text-base font-bold text-text-primary">{{ formatCurrency(orderResult.total_amount) }}</span>
            </div>
            <!-- warocol.com#639 — show tip on a separate line + the total charged to the customer -->
            <div v-if="orderResult.tip_amount && orderResult.tip_amount > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('pos.checkout.summary.tip') }}</span>
              <span class="text-sm font-medium text-text-primary">{{ formatCurrency(orderResult.tip_amount) }}</span>
            </div>
            <div v-if="orderResult.advance_applied && orderResult.advance_applied > 0" class="flex items-center justify-between gap-3">
              <span class="text-sm text-state-success-text">{{ t('pos.checkout.summary.tableAdvance') }}</span>
              <span class="text-sm font-medium text-state-success-text">-{{ formatCurrency(orderResult.advance_applied) }}</span>
            </div>
            <div
              v-if="(orderResult.tip_amount && orderResult.tip_amount > 0) || (orderResult.advance_applied && orderResult.advance_applied > 0)"
              class="flex items-center justify-between gap-3 rounded-md bg-primary/5 px-2.5 py-2"
            >
              <span class="text-sm font-semibold text-text-primary">{{ t('pos.checkout.summary.totalCharged') }}</span>
              <span class="text-lg font-bold leading-none text-primary">
                {{ formatCurrency(orderResultChargedAmount) }}
              </span>
            </div>
            <template v-if="splitPaymentsSnapshot.length > 0">
              <div
                v-for="p in splitPaymentsSnapshot"
                :key="p.id"
                class="flex items-center justify-between gap-3 min-w-0"
              >
                <span class="text-sm text-text-secondary shrink-0">{{ p.payment_method_name }}</span>
                <span class="text-sm font-medium text-text-primary tabular-nums text-end">
                  {{ formatCurrency(p.amount) }}
                </span>
              </div>
            </template>
            <div v-else class="flex items-center justify-between gap-3 min-w-0">
              <span class="text-sm text-text-secondary shrink-0">{{ t('pos.checkout.summary.paymentMethod') }}</span>
              <span class="text-sm font-medium text-text-primary min-w-0 overflow-x-auto whitespace-nowrap text-end">
                {{
                  orderResult.payment_method
                    ? (orderResult.payment_method_name
                        ? `${getPaymentMethodLabel(orderResult.payment_method)} · ${orderResult.payment_method_name}`
                        : getPaymentMethodLabel(orderResult.payment_method))
                    : t('pos.checkout.summary.pendingPayment')
                }}
              </span>
            </div>
          </div>

          <!-- Electronic invoice (DIAN) — cashier triggers emission, but never sees CUFE/PDF -->
          <div v-if="orderResult?.status !== 'pending' && (orderResult?.order_id || (orderResult?.order_ids?.length ?? 0) > 0)" class="mb-4">
            <!-- Not requested yet — gated on tenant readiness (#450) -->
            <template v-if="isInvoicingReady && !isReadinessLoading && !isCreditOnlyInvoiceBlocked && !invoiceResult && !invoiceLoading && !invoiceError && !fiscalWizardOpen">
              <div
                v-if="selectedCustomerIdentity.identitiesDiffer"
                class="mb-2 rounded-lg border border-state-warning-border bg-state-warning-bg px-3 py-2 text-xs leading-snug text-state-warning-text"
              >
                <p class="font-bold">{{ t('pos.checkout.invoice.identityWarningTitle') }}</p>
                <p>
                  {{ t('pos.checkout.invoice.identityWarningBody', {
                    contact: selectedCustomerIdentity.contact.name || selectedCustomerIdentity.contact.phone,
                    acquirer: selectedCustomerIdentity.acquirer.name || selectedCustomerIdentity.acquirer.fiscalId,
                  }) }}
                </p>
              </div>
              <button
                @click="requestInvoice"
                class="w-full min-h-[44px] py-2 px-4 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
	                {{ (orderResult?.order_ids?.length ?? 0) > 1
                  ? t('pos.checkout.invoice.generateMultiple', { count: orderResult?.order_ids?.length })
                  : (isMatiasDian
                    ? t('pos.checkout.invoice.generateDian')
                    : t('pos.checkout.invoice.generateElectronic')) }}
              </button>
            </template>
            <div
              v-else-if="isInvoicingReady && isCreditOnlyInvoiceBlocked"
              class="rounded-lg border border-state-warning-border/70 bg-state-warning-bg/70 px-3 py-2 text-xs font-medium leading-snug text-state-warning-text"
            >
	              {{ isMatiasDian
                ? t('pos.checkout.invoice.creditOnlyShort')
                : t('pos.checkout.invoice.creditOnlyShortNeutral') }}
            </div>

            <!-- Inline fiscal-data wizard -->
            <div v-else-if="fiscalWizardOpen" class="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div class="flex items-start gap-3">
                <svg class="h-[1em] w-[1em] text-primary mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664" /></svg>
                <div class="flex-1">
	                  <p class="text-sm font-semibold text-text-primary">{{ t('pos.checkout.invoice.dataTitle') }}</p>
	                  <p class="text-xs text-text-secondary mt-0.5">{{ t('pos.checkout.invoice.dataHint') }}</p>
                </div>
              </div>

              <div class="space-y-2">
	                <label class="text-xs font-medium text-text-primary">{{ t('pos.customer.documentType') }}</label>
                <select
                  v-model="fiscalWizardForm.fiscal_id_type"
                  :disabled="fiscalWizardSaving"
                  class="w-full min-h-[44px] px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-sm disabled:opacity-50"
                >
	                  <option value="" disabled>{{ t('pos.customer.selectDocumentType') }}</option>
	                  <option value="CC">{{ t('pos.customer.docType.cc') }}</option>
	                  <option value="NIT">{{ t('pos.customer.docType.nit') }}</option>
	                  <option value="CE">{{ t('pos.customer.docType.ce') }}</option>
	                  <option value="PA">{{ t('pos.customer.docType.pa') }}</option>
	                  <option value="TI">{{ t('pos.customer.docType.ti') }}</option>
                </select>
              </div>

              <div class="space-y-2">
	                <label class="text-xs font-medium text-text-primary">{{ t('pos.customer.documentNumber') }}</label>
                <input
                  v-model="fiscalWizardForm.fiscal_id"
                  type="text"
                  @input="fiscalWizardForm.fiscal_id = normalizeFiscalDocumentId(fiscalWizardForm.fiscal_id)"
	                  :placeholder="fiscalWizardForm.fiscal_id_type === 'NIT' ? t('pos.customer.nitPlaceholder') : t('pos.customer.idPlaceholder')"
                  :disabled="fiscalWizardSaving"
                  class="w-full min-h-[44px] px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-sm disabled:opacity-50"
                />
	                <p v-if="fiscalWizardForm.fiscal_id_type === 'NIT'" class="text-xs text-text-tertiary">{{ t('pos.customer.nitWithoutDv') }}</p>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-medium text-text-primary">
	                  {{ fiscalWizardForm.fiscal_id_type === 'NIT' ? t('pos.customer.businessName') : t('pos.customer.legalName') }}
                </label>
                <input
                  v-model="fiscalWizardForm.fiscal_business_name"
                  type="text"
	                  :placeholder="fiscalWizardForm.fiscal_id_type === 'NIT' ? t('pos.customer.businessPlaceholder') : t('pos.customer.personPlaceholder')"
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
	                  {{ t('pos.checkout.actions.cancel') }}
                </button>
                <button
                  type="button"
                  :disabled="!fiscalWizardCanSubmit || fiscalWizardSaving"
                  @click="submitFiscalAndInvoice"
                  class="flex-1 min-h-[44px] px-3 py-2 text-sm bg-action-primary-bg text-action-primary-text font-semibold rounded-lg hover:bg-action-primary-hover-bg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg v-if="fiscalWizardSaving" class="h-[1em] w-[1em] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
	                  {{ fiscalWizardSaving ? t('pos.checkout.invoice.saving') : t('pos.checkout.invoice.continueAndIssue') }}
                </button>
              </div>
            </div>

            <!-- Loading -->
            <div v-else-if="invoiceLoading" class="flex items-center justify-center gap-2 py-3 px-4 bg-surface-secondary rounded-lg">
              <UiLoadingDots size="9px" color="currentColor" aria-hidden="true" />
	              <span class="text-sm text-text-secondary">{{ invoiceProgress || t('pos.checkout.invoice.generating') }}</span>
            </div>

            <!-- Success — one inline line (#2023); email actions below. -->
            <div
              v-else-if="invoiceResult?.prefix && invoiceResult?.invoice_number"
              class="rounded-lg border border-state-success-border bg-state-success-bg px-3 py-2.5 text-center"
            >
              <p class="text-sm font-semibold text-state-success-text">
                {{ t('pos.checkout.invoice.generatedInline', {
                  invoice: `${invoiceResult.prefix}-${invoiceResult.invoice_number}`,
                }) }}
              </p>
            </div>

            <!-- Error -->
            <div v-else-if="invoiceError" class="rounded-lg border border-state-danger-border bg-state-danger-bg p-3 space-y-2">
              <div class="flex items-start gap-2 text-state-danger-text">
                <svg class="h-[1em] w-[1em] shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                <div class="min-w-0 space-y-1">
                  <span class="text-sm font-medium block">{{ invoiceError }}</span>
                  <p v-if="isMatiasAuthInvoiceError" class="text-xs opacity-90">
	                    {{ t('pos.checkout.invoice.matiasAuthError') }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                :disabled="invoiceLoading"
                @click="retryInvoice"
                class="w-full min-h-[44px] py-2 px-4 bg-surface border border-state-danger-border text-state-danger-text text-sm font-semibold rounded-lg hover:bg-state-danger-bg focus:outline-none focus:ring-2 focus:ring-state-danger-border active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg v-if="invoiceLoading" class="h-[1em] w-[1em] animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
	                {{ invoiceLoading ? t('pos.checkout.invoice.retrying') : t('pos.checkout.invoice.retry') }}
              </button>
            </div>
          </div>

          <!-- Receipt actions -->
          <div class="mb-4 space-y-3">
            <!-- Email: autofill without FE; auto-send with FE; always allow another recipient (#2023) -->
            <div class="flex flex-col gap-1.5">
              <div
                v-if="emailSent && lastSentEmail"
                class="flex items-center gap-2 rounded-lg border border-state-success-border bg-state-success-bg px-3 py-2 text-state-success-text"
              >
                <svg class="h-[1em] w-[1em] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                <span class="text-sm font-medium">
                  {{ hasGeneratedInvoice
                    ? t('pos.checkout.invoiceSent', { email: lastSentEmail })
                    : t('pos.checkout.receiptEmail.sentTo', { email: lastSentEmail }) }}
                </span>
              </div>
              <label for="receipt-email" class="text-sm font-medium text-text-primary">
                {{
                  emailSent
                    ? (hasGeneratedInvoice
                      ? t('pos.checkout.invoice.sendAnother')
                      : t('pos.checkout.receiptEmail.sendAnother'))
                    : (hasGeneratedInvoice
                      ? t('pos.checkout.invoice.sendByEmail')
                      : (emailFromProfile
                        ? t('pos.checkout.receiptEmail.askSend')
                        : t('pos.checkout.receiptEmail.label')))
                }}
                <span
                  v-if="!emailFromProfile && !emailSent"
                  class="font-normal text-text-tertiary"
                >{{ t('pos.checkout.optional') }}</span>
              </label>
              <div class="flex gap-2">
                <input
                  id="receipt-email"
                  v-model="receiptEmail"
                  type="email"
                  placeholder="cliente@email.com"
                  autocomplete="email"
                  class="flex-1 min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  @click="sendReceiptEmail"
                  :disabled="!receiptEmail || isSendingEmail"
                  class="shrink-0 min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-action-primary-bg text-action-primary-text hover:bg-action-primary-hover-bg"
                >
                  <span v-if="isSendingEmail">{{ t('pos.checkout.receiptEmail.sending') }}</span>
                  <span v-else-if="emailFromProfile && !emailSent">{{ t('pos.checkout.receiptEmail.confirmSend') }}</span>
                  <span v-else>{{ t('pos.checkout.receiptEmail.send') }}</span>
                </button>
              </div>
            </div>

            <!-- Print -->
            <button
              @click="printReceipt"
              class="w-full min-h-[44px] py-2 px-4 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <svg class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
              </svg>
	              {{ t('pos.checkout.actions.printReceipt') }}
            </button>
          </div>
          </div>

          <!-- Sticky CTA -->
          <div class="flex-shrink-0 border-t border-border p-4 bg-surface">
            <button
              type="button"
              class="w-full min-h-[44px] py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-lg font-medium hover:bg-action-primary-hover-bg transition-colors"
              @click="closeSuccessModal"
            >
              {{ t('pos.checkout.actions.newSale') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>


    <PosReceiptPrintTicket
      v-if="orderResult"
      :fiscal-data="fiscalData"
      :platform-legal="platformLegal"
      :matias-dian="isMatiasDian"
      :display-name="posCheckoutBusiness.display_name"
      :address="posCheckoutBusiness.address"
      :city="posCheckoutBusiness.city"
      :phone="posCheckoutBusiness.phone_number"
      :logo-url="receiptLogoUrl"
      :document-label="receiptDocumentLabel"
      :order-number="orderResult.order_number"
      :sold-at="receiptPrintContext?.soldAt"
      :location-label="receiptLocationLabel"
      :waiter-name="receiptPrintContext?.waiterName"
      :delivery="checkoutReceiptDelivery"
      :customer-name="receiptPrintContext?.customerName"
      :customer-phone="receiptPrintContext?.customerPhone"
      :customer-email="receiptPrintContext?.customerEmail"
      :customer-fiscal-label="receiptCustomerFiscalLabel"
      :items="receiptTicketItems"
      :subtotal="orderResult.subtotal"
      :promo-breakdown="receiptPromoBreakdown"
      :discount-amount="Number(orderResult.discount_amount) || 0"
      :waro-discount-label="orderResultWaroLineLabel"
      :waro-discount-amount="orderResultWaroDiscountCop"
      :standard-tax-label="orderResult.standard_tax_label"
      :standard-tax="Number(orderResult.standard_tax) || 0"
      :liquor-tax-label="orderResult.liquor_tax_label"
      :liquor-tax="Number(orderResult.liquor_tax) || 0"
      :order-total="Number(orderResult.total_amount) || 0"
      :tip-label="receiptTipLabel"
      :tip-amount="Number(orderResult.tip_amount) || 0"
      :advance-applied="Number(orderResult.advance_applied) || 0"
      :charged-total="orderResultChargedAmount"
      :payments="receiptPaymentLines"
      :single-payment-label="receiptSinglePaymentLabel"
      :invoice="receiptInvoice"
    />

  <!-- Issue #535 — Hidden prefactura for printing.
       Only visible via @media print + body class .printing-prefactura.
       The prefactura footer disclaimer is legally relevant — never remove it
       or make it visually less prominent. -->
  <div id="pos-prefactura" aria-hidden="true">
    <PosReceiptPrintHeader
      :fiscal-data="fiscalData"
      :display-name="posCheckoutBusiness.display_name"
      :address="posCheckoutBusiness.address"
      :city="posCheckoutBusiness.city"
      :phone="posCheckoutBusiness.phone_number"
      :logo-url="receiptLogoUrl"
    />
    <div class="receipt-divider">================================</div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">
      {{ prefacturaDocumentLabel }}<span v-if="prefacturaDocNumber"> #{{ prefacturaDocNumber }}</span>
    </div>
    <div v-if="prefacturaSaleMetaLine" class="receipt-row receipt-small">{{ prefacturaSaleMetaLine }}</div>
    <template v-if="prefacturaSaleContactLine || prefacturaAcquirerLine">
      <div class="receipt-plain-line receipt-small">{{ prefacturaSectionSep }}</div>
      <div v-if="prefacturaSaleContactLine" class="receipt-row receipt-small">
        <span style="font-weight:bold;">{{ t('pos.receipt.saleContact') }}</span>
        · {{ prefacturaSaleContactLine }}
      </div>
      <div v-if="prefacturaAcquirerLine" class="receipt-row receipt-small">
        <span style="font-weight:bold;">{{ t('pos.receipt.fiscalAcquirer') }}</span>
        · {{ prefacturaAcquirerLine }}
      </div>
    </template>
    <PosReceiptDeliveryBlock :delivery="checkoutReceiptDelivery" />
    <div class="receipt-plain-line receipt-small">{{ prefacturaSectionSep }}</div>

    <div class="receipt-plain-line receipt-small">{{ padReceiptLine(t('pos.receipt.description'), t('pos.receipt.total')) }}</div>
    <template v-for="(item, idx) in printablePrefacturaItems" :key="item.id ?? item.orderItemId">
      <div v-if="idx > 0" class="receipt-plain-line receipt-small">{{ prefacturaItemSep }}</div>
      <pre class="receipt-plain-pre">{{ prefacturaProductBlock(item) }}</pre>
      <pre
        v-for="mod in (item.modifiers ?? [])"
        :key="`${item.id ?? item.orderItemId}-${mod.id}`"
        class="receipt-plain-pre"
      >{{ prefacturaModifierBlock(mod) }}</pre>
    </template>
    <div class="receipt-plain-line receipt-small">{{ prefacturaSectionSep }}</div>

    <div v-if="prefacturaPrintData.promoSavings > 0 || prefacturaPrintData.manualDiscountAmount > 0 || prefacturaPrintData.waroDiscountCop > 0" class="receipt-plain-line">
      {{ prefacturaMoneyLine(t('pos.receipt.subtotal'), prefacturaPrintData.cartSubtotal) }}
    </div>
    <div
      v-for="promo in prefacturaPrintData.promoBreakdown"
      :key="promo.promotion_id ?? promo.promotion_name"
      class="receipt-plain-line"
    >
      {{ prefacturaMoneyLine(promo.promotion_name, promo.savings, true) }}
    </div>
    <div v-if="prefacturaPrintData.manualDiscountAmount > 0" class="receipt-plain-line">
      {{ prefacturaMoneyLine(t('pos.receipt.manualDiscount'), prefacturaPrintData.manualDiscountAmount, true) }}
    </div>
    <div v-if="prefacturaPrintData.waroDiscountCop > 0" class="receipt-plain-line">
      {{ prefacturaMoneyLine(prefacturaPrintData.waroRewardName ? `WaRo: ${prefacturaPrintData.waroRewardName}` : t('pos.receipt.waroRedeem'), prefacturaPrintData.waroDiscountCop, true) }}
    </div>
    <div v-if="taxPreview && taxPreview.standard_tax > 0" class="receipt-plain-line">
      {{ prefacturaTaxBulletLine(localizedInternalTaxLabel(taxPreview.standard_tax_label), taxPreview.standard_tax) }}
    </div>
    <div v-if="taxPreview && taxPreview.liquor_tax > 0" class="receipt-plain-line">
      {{ prefacturaTaxBulletLine(taxPreview.liquor_tax_label || t('pos.receipt.liquorVat'), taxPreview.liquor_tax) }}
    </div>
    <!-- warocol.com#739 + #939 — pre-bill totals include tip, advance, and split settlement when applicable -->
    <template v-if="prefacturaPrintData.tipAmount > 0 || prefacturaPrintData.advanceApplied > 0">
      <div class="receipt-plain-line">
        {{ prefacturaMoneyLine(t('pos.receipt.orderTotal'), prefacturaPrintData.orderTotal) }}
      </div>
      <div class="receipt-plain-line">
        {{ prefacturaMoneyLine(receiptTipLabel, prefacturaPrintData.tipAmount) }}
      </div>
      <div v-if="prefacturaPrintData.tipTaxAmount > 0" class="receipt-plain-line">
        {{ prefacturaMoneyLine(prefacturaPrintData.tipTaxLabel, prefacturaPrintData.tipTaxAmount) }}
      </div>
      <div v-if="prefacturaPrintData.advanceApplied > 0" class="receipt-plain-line">
        {{ prefacturaMoneyLine(t('pos.receipt.tableAdvance'), prefacturaPrintData.advanceApplied, true) }}
      </div>
      <div class="receipt-plain-line receipt-plain-total">
        {{ prefacturaMoneyLine(t('pos.receipt.totalDue'), prefacturaPrintData.amountDue) }}
      </div>
    </template>
    <div v-else class="receipt-plain-line receipt-plain-total">
      {{ prefacturaMoneyLine(t('pos.receipt.totalUpper'), prefacturaPrintData.orderTotal) }}
    </div>
    <template v-if="prefacturaPrintData.splitPayments.length > 0">
      <div class="receipt-plain-line receipt-small">{{ prefacturaSectionSep }}</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.paymentsRegistered') }}</div>
      <div
        v-for="(p, idx) in prefacturaPrintData.splitPayments"
        :key="p.id"
        class="receipt-plain-line receipt-small"
      >
        {{ prefacturaMoneyLine(`#${idx + 1} - ${p.payment_method_name}`, p.amount) }}
      </div>
      <div class="receipt-plain-line">
        {{ prefacturaMoneyLine(prefacturaPrintData.splitIsComplete ? t('pos.receipt.paymentComplete') : t('pos.receipt.balancePending'), prefacturaPrintData.splitRemaining) }}
      </div>
    </template>

    <div v-if="isKitchenServiceMode && cartItems.some(i => i.fired === false)" class="receipt-row receipt-small" style="margin-top:6px;">
      {{ t('pos.receipt.pendingKitchen') }}
    </div>

    <div class="receipt-plain-line">{{ prefacturaStrong }}</div>
    <!-- Issue #535 — Legal disclaimer: do NOT remove. -->
    <div class="receipt-footer receipt-small" style="font-weight:bold;">{{ t('pos.receipt.prefacturaBanner') }}</div>
    <div class="receipt-footer receipt-small">
      {{ isMatiasDian
        ? t('pos.receipt.prefacturaNotFiscal')
        : t('pos.receipt.prefacturaNotFiscalNeutral') }}
    </div>
    <!-- WARO = software/tecnología; emisor/vendedor = establecimiento (tenant) -->
    <PosReceiptPlatformFooter
      document-kind="prefactura"
      :platform-legal="platformLegal"
      :matias-dian="isMatiasDian"
    />
  </div>

  <!-- Hidden receipt for printing — only visible via @media print -->
  <div id="pos-receipt" aria-hidden="true">
    <PosReceiptPrintHeader
      :fiscal-data="fiscalData"
      :display-name="posCheckoutBusiness.display_name"
      :address="posCheckoutBusiness.address"
      :city="posCheckoutBusiness.city"
      :phone="posCheckoutBusiness.phone_number"
      :logo-url="receiptLogoUrl"
    />
    <div class="receipt-divider">================================</div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">
      {{ receiptDocumentLabel }}<span v-if="(orderResult?.order_number ?? 0) > 0"> #{{ orderResult?.order_number }}</span>
    </div>
    <div v-if="checkoutSaleMetaLine" class="receipt-row receipt-small">{{ checkoutSaleMetaLine }}</div>
    <template v-if="checkoutSaleContactLine">
      <div class="receipt-plain-line receipt-small">{{ prefacturaSectionSep }}</div>
      <div class="receipt-row receipt-small">
        <span style="font-weight:bold;">{{ t('pos.receipt.saleContact') }}:</span>
        {{ ' ' }}{{ checkoutSaleContactLine }}
      </div>
    </template>
    <PosReceiptDeliveryBlock :delivery="checkoutReceiptDelivery" />
    <div class="receipt-plain-line receipt-small">{{ prefacturaSectionSep }}</div>

    <div class="receipt-grid-header receipt-small">
      <span class="receipt-col-desc">{{ t('pos.receipt.description') }}</span>
      <span class="receipt-col-qty">{{ t('pos.receipt.qty') }}</span>
      <span class="receipt-col-price">{{ t('pos.receipt.price') }}</span>
      <span class="receipt-col-total">{{ t('pos.receipt.total') }}</span>
    </div>
    <template v-for="(item, idx) in printableReceiptItems" :key="item.id ?? item.orderItemId">
      <div v-if="idx > 0" class="receipt-divider receipt-small">{{ prefacturaItemSep }}</div>
      <div class="receipt-grid-row receipt-small">
        <span class="receipt-col-desc">• {{ item.product?.name || item.name }}</span>
        <span class="receipt-col-qty">{{ item.quantity }}</span>
        <span class="receipt-col-price">{{ formatCurrencyThermal(getItemUnitPrice(item)) }}</span>
        <span class="receipt-col-total">{{ formatCurrencyThermal(getItemTotal(item)) }}</span>
      </div>
      <div
        v-for="mod in (item.modifiers ?? [])"
        :key="`${item.id ?? item.orderItemId}-${mod.id}`"
        class="receipt-grid-row receipt-small receipt-modifier-row"
      >
        <span class="receipt-col-desc">{{ formatModifierPrintDesc(mod) }}</span>
        <span class="receipt-col-qty">{{ (Number(mod.quantity) || 1) > 1 ? mod.quantity : '' }}</span>
        <span class="receipt-col-price">{{ formatCurrencyThermal(Number(mod.price) || 0) }}</span>
        <span class="receipt-col-total">{{ formatCurrencyThermal(getModifierLineTotal(mod)) }}</span>
      </div>
    </template>
    <div class="receipt-divider">--------------------------------</div>

    <div
      v-if="orderResult && (orderResult.promo_savings || orderResult.discount_amount || orderResult.waro_discount_cop) && orderResult.subtotal"
      class="receipt-item"
    >
      <span>Subtotal</span>
      <span>{{ formatCurrencyThermal(orderResult.subtotal) }}</span>
    </div>
    <div
      v-for="promo in receiptPromoBreakdown"
      :key="promo.promotion_id ?? promo.promotion_name"
      class="receipt-item"
    >
      <span>{{ promo.promotion_name }}</span>
      <span>-{{ formatCurrencyThermal(promo.savings) }}</span>
    </div>
    <div v-if="orderResult?.discount_amount" class="receipt-item">
	      <span>{{ t('pos.receipt.manualDiscount') }}</span>
      <span>-{{ formatCurrencyThermal(orderResult.discount_amount) }}</span>
    </div>
    <div v-if="orderResultWaroDiscountCop > 0" class="receipt-item">
      <span>{{ orderResultWaroLineLabel }}</span>
      <span>-{{ formatCurrencyThermal(orderResultWaroDiscountCop) }}</span>
    </div>
    <template v-if="orderResult?.standard_tax && orderResult.standard_tax > 0 || orderResult?.liquor_tax && orderResult.liquor_tax > 0">
	      <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.taxDetail') }}</div>
      <div v-if="orderResult?.standard_tax && orderResult.standard_tax > 0" class="receipt-plain-line receipt-small">
        {{ prefacturaTaxBulletLine(localizedInternalTaxLabel(orderResult.standard_tax_label), orderResult.standard_tax) }}
      </div>
      <div v-if="orderResult?.liquor_tax && orderResult.liquor_tax > 0" class="receipt-plain-line receipt-small">
	        {{ prefacturaTaxBulletLine(localizedInternalTaxLabel(orderResult.liquor_tax_label) || t('pos.receipt.liquorVat'), orderResult.liquor_tax) }}
      </div>
    </template>
    <!-- warocol.com#739 — printed receipt mirrors success modal + split payments -->
    <template v-if="(orderResult?.tip_amount && orderResult.tip_amount > 0) || (orderResult?.advance_applied && orderResult.advance_applied > 0)">
      <div class="receipt-item">
	        <span>{{ t('pos.receipt.orderTotal') }}</span>
        <span>{{ formatCurrencyThermal(orderResult?.total_amount ?? 0) }}</span>
      </div>
      <div v-if="orderResult?.tip_amount && orderResult.tip_amount > 0" class="receipt-item">
        <span>{{ receiptTipLabel }}</span>
        <span>{{ formatCurrencyThermal(orderResult.tip_amount) }}</span>
      </div>
      <div v-if="orderResult?.advance_applied && orderResult.advance_applied > 0" class="receipt-item">
	        <span>{{ t('pos.receipt.tableAdvance') }}</span>
        <span>-{{ formatCurrencyThermal(orderResult.advance_applied) }}</span>
      </div>
      <div class="receipt-total">
	        <span>{{ t('pos.receipt.totalChargedUpper') }}</span>
        <span>{{ formatCurrencyThermal(orderResultChargedAmount) }}</span>
      </div>
    </template>
    <div v-else class="receipt-total">
      <span>TOTAL</span>
      <span>{{ formatCurrencyThermal(orderResult?.total_amount ?? 0) }}</span>
    </div>
    <div class="receipt-divider">--------------------------------</div>
	    <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.paymentDetail') }}</div>
    <template v-if="splitPaymentsSnapshot.length > 0">
      <template v-for="(p, idx) in splitPaymentsSnapshot" :key="p.id">
        <div class="receipt-item receipt-small">
          <span>#{{ idx + 1 }} · {{ p.payment_method_name }}</span>
          <span>{{ formatCurrencyThermal(p.amount) }}</span>
        </div>
        <div v-if="p.change && p.change > 0" class="receipt-item receipt-small">
	          <span>{{ t('pos.receipt.changeNumber', { number: idx + 1 }) }}</span>
          <span>{{ formatCurrencyThermal(p.change) }}</span>
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
	            : t('pos.checkout.summary.pendingPayment')
        }}</span>
        <span>{{ formatCurrencyThermal(orderResultChargedAmount) }}</span>
      </div>
      <div
        v-if="receiptPrintContext?.singlePaymentChange && receiptPrintContext.singlePaymentChange > 0"
        class="receipt-item receipt-small"
      >
	        <span>{{ t('pos.receipt.change') }}</span>
        <span>{{ formatCurrencyThermal(receiptPrintContext.singlePaymentChange) }}</span>
      </div>
    </template>
    <div class="receipt-divider">================================</div>
	    <div class="receipt-footer">{{ t('pos.receipt.thanks') }}</div>
    <!-- DIAN invoice section on printed receipt -->
    <template v-if="invoiceResult">
      <div class="receipt-divider">================================</div>
	      <div class="receipt-row" style="font-weight:bold;">{{ t('pos.receipt.electronicInvoice') }}</div>
      <div class="receipt-row">{{ invoiceResult.prefix }}-{{ invoiceResult.invoice_number }}</div>
      <div v-if="receiptIssuerLabel" class="receipt-row receipt-small">
	        {{ t('pos.receipt.issuer', { label: receiptIssuerLabel }) }}
      </div>
      <div v-if="receiptInvoice?.acquirerLabel" class="receipt-row receipt-small">
        {{ t('pos.receipt.acquirer', { label: receiptInvoice.acquirerLabel }) }}
      </div>
      <div v-if="invoiceResult.cufe" class="receipt-row receipt-small receipt-cufe">
        CUFE: {{ invoiceResult.cufe }}
      </div>
      <img
        v-if="invoiceQrDataUrl"
        :src="invoiceQrDataUrl"
        :alt="t('pos.receipt.qrDianAlt')"
        class="receipt-qr"
      >
	      <div v-if="invoiceResult.cufe" class="receipt-row receipt-small">{{ t('pos.receipt.verifyDian') }}</div>
      <div class="receipt-divider">================================</div>
      <PosReceiptPlatformFooter document-kind="fe" :platform-legal="platformLegal" :matias-dian="true" />
    </template>
    <template v-else>
      <div class="receipt-divider receipt-small">--------------------------------</div>
	      <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.saleReceipt') }}</div>
	      <div class="receipt-row receipt-small">
        {{ isMatiasDian
          ? t('pos.receipt.notDianInvoice')
          : t('pos.receipt.notElectronicInvoice') }}
      </div>
      <div v-if="receiptIssuerLabel" class="receipt-row receipt-small">
	        {{ t('pos.receipt.seller', { label: receiptIssuerLabel }) }}
      </div>
      <PosReceiptPlatformFooter
        document-kind="sale"
        :platform-legal="platformLegal"
        :matias-dian="isMatiasDian"
      />
    </template>
  </div>

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

/* Prefactura product-line layout — mirrors ReceiptPrintTicket so numbers
   (qty × price = total) never overlap on narrow thermal paper. */
#pos-prefactura .receipt-plain-line,
#pos-prefactura .receipt-plain-pre,
#pos-receipt .receipt-plain-line,
#pos-receipt .receipt-plain-pre {
  display: block;
  margin: 2px 0;
  padding: 0;
  white-space: pre;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  line-height: 1.25;
  text-align: left;
  overflow: hidden;
}
#pos-prefactura .receipt-plain-total,
#pos-receipt .receipt-plain-total {
  font-weight: 700;
  margin-top: 4px;
}
#pos-prefactura .receipt-product-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2mm;
  align-items: baseline;
  font-weight: bold;
  border-bottom: 1px dashed #000;
  padding-bottom: 2px;
  margin-bottom: 3px;
}
#pos-prefactura .receipt-product-line {
  margin: 0 0 3px;
  break-inside: avoid;
  page-break-inside: avoid;
}
#pos-prefactura .receipt-product-name {
  overflow-wrap: anywhere;
}
#pos-prefactura .receipt-product-values {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2mm;
  align-items: baseline;
  padding-left: 2mm;
}
#pos-prefactura .receipt-product-values span:last-child,
#pos-prefactura .receipt-product-values strong {
  text-align: right;
  white-space: nowrap;
}
#pos-prefactura .receipt-modifier-row {
  padding-left: 2mm;
  margin-top: -1px;
  font-size: 0.92em;
}

/* Checkout success slideover (#1985) — matches ComandasEstadoPanel motion */
.checkout-success-panel-enter-active,
.checkout-success-panel-leave-active {
  transition: transform 0.25s ease;
}
.checkout-success-panel-enter-from,
.checkout-success-panel-leave-to {
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .checkout-success-panel-enter-from,
  .checkout-success-panel-leave-to {
    transform: translateX(100%);
  }
}
</style>

<style>
@media print {
  /* Reset browser default margins */
  body {
    margin: 0;
    padding: 0;
  }

  /* Hide everything, then reveal only the legacy receipt unless the shared
     receipt component is driving this print job. */
  body * { visibility: hidden; }
  body:not(.printing-receipt-ticket) #pos-receipt,
  body:not(.printing-receipt-ticket) #pos-receipt * { visibility: visible; }

  body.printing-receipt-ticket #pos-receipt,
  body.printing-receipt-ticket #pos-receipt *,
  body.printing-receipt-ticket #pos-prefactura,
  body.printing-receipt-ticket #pos-prefactura * {
    display: none !important;
    visibility: hidden !important;
  }

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
  body.printing-receipt-ticket #pos-receipt,
  body.printing-receipt-ticket #pos-prefactura { display: none !important; }
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
