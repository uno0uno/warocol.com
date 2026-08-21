<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
definePageMeta({ layout: 'dashboard', module: 'ventas' })

useHead({ title: () => t('ventas.head.crear') })

import { modifierLineTotal, saleLineTotal, formatSaleModifierPriceLabel, mapApiModifierToSaleOption, normalizeModifierOptionType, saleModifierPriceClass } from '~/utils/saleModifierOption'
import { formatModifierOptionTypeLabel } from '~/composables/useModifierOptionForm'
import { firstMissingRequiredModifierGroup } from '~/utils/modifierSelection'
import {
  WALLET_PAYMENT_SLUG,
  mergePosPaymentGroupsFromApi,
  type ApiPaymentGroup,
  type PosPaymentGroup,
} from '~/utils/paymentDefaults'
import { buildCustomerIdentityPresentation } from '~/utils/customerIdentityPresentation'
import { useOpenSale } from '~/composables/useOpenSale'
import type { ActiveTableSession } from '~/stores/usePOSStore'
import { isWompiPaymentMethod } from '~/utils/wompiCollections'
import { subscribeOrderPaymentApproved } from '~/composables/useNotifications'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModifierOption {
  id: string
  name: string
  price: number
  quantity?: number
  max_limit?: number
  included_quantity?: number
  option_type?: string
  type_label?: string
}

interface ModifierGroup {
  id: string
  name: string
  is_required: boolean
  min_qty: number
  max_qty: number
  modifiers: ModifierOption[]
}

interface LineItem {
  product_id: string
  quantity: number
  unit_price: number
  modifier_groups: ModifierGroup[]
  selected_modifiers: ModifierOption[]
  display_name?: string | null
  notes?: string | null
  is_open_sale?: boolean
}

interface SelectedCustomer {
  id: string
  name: string | null
  phone_number: string | null
  email: string | null
  fiscal_id_type?: string | null
  fiscal_id?: string | null
  fiscal_business_name?: string | null
  fiscal_email?: string | null
}

interface ManualSplitPayment {
  id: string
  amount: number
  payment_method: string
  payment_method_id: string | null
}

// ─── State ───────────────────────────────────────────────────────────────────

const loading = ref(false)
const activeItemIndex = ref<number | null>(null)
const showCustomerModal = ref(false)
const selectedCustomer = ref<SelectedCustomer | null>(null)
const pendingProduct = ref<any | null>(null)
const pendingItem = ref<LineItem | null>(null)
const searchQuery = ref('')
const selectedCategory = ref('all')
const showMobileCartSheet = ref(false)
const discountEnabled = ref(false)
const discountType = ref<'percent' | 'fixed'>('percent')
const discountInput = ref('')
const splitMode = ref(false)
const splitAmountInput = ref<number | null>(null)
const splitPayments = ref<ManualSplitPayment[]>([])
const openSaleModalOpen = ref(false)
const openSaleModalRef = ref<{ clearSubmitting: () => void } | null>(null)
const isMesaMode = computed(() => false)
const activeTableSession = ref<ActiveTableSession | null>(null)

const { currentTenant } = useTenantReactive()
const { data: settingsData } = useQuery({
  key: () => ['pos', 'restaurant-context', currentTenant.value?.id ?? null],
  query: () => $fetch<{ success: boolean; data: any }>('/api/pos/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const {
  openSaleProduct,
  showOpenSaleButton,
  openSaleEnabled,
  openSaleDisabledReason,
  validateOpenSaleAmount,
  buildOpenSaleCartLine,
} = useOpenSale({
  settingsData,
  isMesaMode,
  activeTableSession,
})

// Pre-fill the datetime-local input with the user's LOCAL time, not UTC.
// `Date.prototype.toISOString()` returns UTC, which the input then renders
// AS IF it were local — so a user in Bogota (UTC-5) at 2:30 PM would see
// the input showing "8:30 PM" of the wrong date and submit a 5-hour-skewed
// timestamp without noticing. Build the local-time string manually instead.
const localNowISO = (): string => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Form state stores BOTH the group slug AND the method UUID. The slug is
// what /api/orders/manual has historically accepted; payment_method_id is
// the specific method (Nequi / PSE / Daviplata...) so the GL posting can
// resolve to the right sub-account when manual orders also auto-post.
const form = ref({
  order_date: localNowISO(),
  payment_method: 'cash',
  payment_method_id: null as string | null,
  items: [] as LineItem[]
})

// ─── Products catalog ─────────────────────────────────────────────────────────

const { data: productsData, pending: loadingProducts } = useFetch('/api/menu/products', {
  query: { is_available: true, limit: 250, include_modifiers: true }
})

const products = computed(() => {
  const rows = productsData.value?.data ?? []
  return rows
    .filter((p: any) => !p.open_priced)
    .map((p: any) => ({
      ...p,
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      category: p.category_name || p.category?.name || p.category || t('ventas.common.sinCategoria'),
      category_id: p.category_id ?? null,
      image: p.image || '🍽️',
      image_url: p.image_url || null,
      available: p.is_available !== false,
      is_resale: p.is_resale || false,
      modifier_groups: p.modifier_groups || [],
    }))
})

const categories = computed(() => {
  const cats = new Set(products.value.map((p: any) => p.category || t('ventas.common.sinCategoria')))
  return ['all', ...Array.from(cats).sort((a, b) => a.localeCompare(b))]
})

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return products.value.filter((product: any) => {
    const matchesSearch = !q || product.name.toLowerCase().includes(q)
    const matchesCategory = selectedCategory.value === 'all' || product.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

watch(categories, (cats) => {
  if (!cats.includes(selectedCategory.value)) {
    selectedCategory.value = 'all'
  }
})

// ─── Payment methods (dynamic, same source as POS) ──────────────────────────
const { data: paymentGroupsData } = useFetch<{ success: boolean; data: ApiPaymentGroup[] }>(
  '/api/pos/payment-methods',
)
const paymentGroups = computed(() => mergePosPaymentGroupsFromApi(paymentGroupsData.value?.data ?? []))
const { groupLabel, resolveLabel } = usePaymentLabel(paymentGroups)
const customerIdRef = computed(() => selectedCustomer.value?.id ?? '')
const { wallet: customerWallet, isLoading: isLoadingWallet, isRefreshing: isRefreshingWallet } =
  useCustomerWallet(customerIdRef)
const walletBalanceCop = computed(() => customerWallet.value?.balance_cop ?? 0)
const isWalletPending = computed(() => isLoadingWallet.value || isRefreshingWallet.value)
const isAnonymousCustomer = computed(() => selectedCustomer.value?.phone_number === '0000000000')

function isPaymentGroupVisible(group: PosPaymentGroup) {
  if (group.triggersCartera) {
    return !!(selectedCustomer.value && !isAnonymousCustomer.value)
  }
  if (group.slug === WALLET_PAYMENT_SLUG || group.triggersWallet) {
    return !!(selectedCustomer.value && !isAnonymousCustomer.value && walletBalanceCop.value > 0)
  }
  return true
}

const visiblePaymentGroups = computed(() => paymentGroups.value.filter(isPaymentGroupVisible))
const isWompiTender = computed(() => {
  const group = paymentGroups.value.find(g => g.slug === form.value.payment_method)
  if (!group) return false
  const method = form.value.payment_method_id
    ? group.methods?.find(m => m.id === form.value.payment_method_id)
    : null
  if (method) return isWompiPaymentMethod(method)
  if ((group.methods?.length ?? 0) === 1) return isWompiPaymentMethod(group.methods[0])
  return isWompiPaymentMethod(group)
})
const showWompiSlideover = ref(false)
const wompiOrderId = ref<string | null>(null)
const wompiAmount = ref(0)
function onWompiCollectionApproved () {
  const orderId = wompiOrderId.value
  if (!orderId) return
  showWompiSlideover.value = false
  wompiOrderId.value = null
  useToast().success(t('ventas.crear.success'), { title: t('ventas.crear.successTitle') })
  void navigateTo(`/ventas/${orderId}`)
}
let unsubscribeWompiPayment: (() => void) | null = subscribeOrderPaymentApproved((payload) => {
  if (payload.order_id && payload.order_id === wompiOrderId.value) {
    onWompiCollectionApproved()
  }
})

// Single composed value for the v-model: "groupSlug:methodId" or "groupSlug:".
// "cash:" means group "cash" without a specific method (group default).
// "digital:b523-…" means group "digital" + that specific method UUID.
const paymentSelectValue = computed({
  get: () => `${form.value.payment_method}:${form.value.payment_method_id ?? ''}`,
  set: (v: string) => {
    const idx = v.indexOf(':')
    const slug = idx === -1 ? v : v.slice(0, idx)
    const methodId = idx === -1 ? '' : v.slice(idx + 1)
    form.value.payment_method = slug
    form.value.payment_method_id = slug === WALLET_PAYMENT_SLUG ? null : (methodId || null)
  },
})

watch(visiblePaymentGroups, (groups) => {
  if (groups.some(g => g.slug === form.value.payment_method)) return
  const fallback = groups[0]
  if (!fallback) return
  form.value.payment_method = fallback.slug
  form.value.payment_method_id = null
}, { immediate: true })

// ─── Computed helpers ─────────────────────────────────────────────────────────

const activeItem = computed(() =>
  activeItemIndex.value !== null ? form.value.items[activeItemIndex.value] : null
)

const customizationItem = computed(() => pendingItem.value ?? activeItem.value)
const customizationProduct = computed(() =>
  pendingProduct.value ?? (customizationItem.value ? productFor(customizationItem.value) : null)
)

// ─── Manual cart helpers ──────────────────────────────────────────────────────

function normalizeModifierGroups(groups: any[] = []): ModifierGroup[] {
  return groups.map(group => ({
    id: String(group.id),
    name: String(group.name || ''),
    is_required: Boolean(group.is_required),
    min_qty: Math.max(0, Number(group.min_qty) || 0),
    max_qty: Math.max(1, Number(group.max_qty) || 1),
    modifiers: (group.modifiers || [])
      .filter((mod: any) => mod && mod.is_available !== false)
      .map((mod: any) => mapApiModifierToSaleOption(mod as Record<string, unknown>)),
  }))
}

function normalizeSelectedModifier(modifier: ModifierOption): ModifierOption {
  return {
    ...modifier,
    quantity: Math.max(1, Number(modifier.quantity) || 1),
  }
}

function buildLineItem(product: any, selectedModifiers: ModifierOption[] = []): LineItem {
  return {
    product_id: product.id,
    quantity: 1,
    unit_price: Number(product.price) || 0,
    modifier_groups: normalizeModifierGroups(product.modifier_groups || []),
    selected_modifiers: selectedModifiers.map(normalizeSelectedModifier)
  }
}

function addProductToCart(product: any, selectedModifiers: ModifierOption[] = []) {
  if (!product) return
  // Always create a new line item (same product can appear multiple times with different modifiers)
  form.value.items.push(buildLineItem(product, selectedModifiers))
}

function selectProduct(product: any) {
  if (!product) return
  if (product.is_resale === true) {
    closeProductDetail()
    addProductToCart(product)
    return
  }
  pendingProduct.value = product
  pendingItem.value = buildLineItem(product)
  activeItemIndex.value = null
}

function closeProductDetail() {
  pendingProduct.value = null
  pendingItem.value = null
}

function closeCustomizationPanel() {
  if (pendingItem.value) {
    closeProductDetail()
    return
  }
  activeItemIndex.value = null
}

function confirmProductDetail() {
  if (!pendingProduct.value || !pendingItem.value) return
  const missingGroup = missingRequiredModifierGroupForItem(pendingItem.value)
  if (missingGroup) {
    notifyMissingRequiredGroup(missingGroup)
    return
  }
  addProductToCart(pendingProduct.value, pendingItem.value.selected_modifiers)
  closeProductDetail()
}

function incrementItem(index: number) {
  form.value.items[index].quantity++
}

function removeItem(index: number) {
  form.value.items.splice(index, 1)
  if (activeItemIndex.value === index) {
    activeItemIndex.value = null
  } else if (activeItemIndex.value !== null && activeItemIndex.value > index) {
    activeItemIndex.value--
  }
}

function decrementItem(index: number) {
  if (form.value.items[index].quantity > 1) {
    form.value.items[index].quantity--
  } else {
    removeItem(index)
  }
}

function cartQtyFor(productId: string) {
  return form.value.items
    .filter((i: LineItem) => i.product_id === productId)
    .reduce((sum: number, i: LineItem) => sum + i.quantity, 0)
}

function productFor(item: LineItem) {
  return products.value.find((p: any) => p.id === item.product_id)
}

function itemDisplayName(item: LineItem) {
  return item.display_name || productFor(item)?.name || t('ventas.crear.productFallback')
}

function handleOpenSaleClick() {
  if (!openSaleEnabled.value) {
    useToast().warning(openSaleDisabledReason.value ?? t('pos.banner.openSaleUnavailable'), {
      title: t('pos.banner.openSale'),
    })
    return
  }
  openSaleModalOpen.value = true
}

function handleOpenSaleConfirm(payload: { amount: number; description?: string }) {
  try {
    const amount = validateOpenSaleAmount(payload.amount)
    const line = buildOpenSaleCartLine(amount, payload.description)
    form.value.items.push({
      product_id: line.product.id,
      quantity: 1,
      unit_price: amount,
      modifier_groups: [],
      selected_modifiers: [],
      display_name: line.product.name,
      notes: line.notes ?? null,
      is_open_sale: true,
    })
    openSaleModalOpen.value = false
    useToast().success(t('pos.banner.addedToCart'), { title: t('pos.banner.openSale') })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('pos.banner.openSaleAddError')
    useToast().error(message, { title: t('pos.banner.openSale') })
    openSaleModalRef.value?.clearSubmitting()
  }
}

// ─── Modifier helpers ─────────────────────────────────────────────────────────

function getModifierQty(item: LineItem, modifierId: string): number {
  return item.selected_modifiers.find(m => m.id === modifierId)?.quantity ?? 0
}

function isSingleSelectGroup(group: ModifierGroup): boolean {
  return Math.max(1, Number(group.max_qty) || 1) === 1
}

function selectRadioModifier(item: LineItem, option: ModifierOption, group: ModifierGroup) {
  const isSelected = isModifierSelected(item, option.id)
  if (!group.is_required && group.min_qty <= 0 && isSelected) {
    item.selected_modifiers = item.selected_modifiers.filter(m => m.id !== option.id)
    return
  }

  item.selected_modifiers = item.selected_modifiers.filter(m =>
    !group.modifiers.some(o => o.id === m.id)
  )
  item.selected_modifiers.push({ ...option, quantity: 1 })
}

function canIncrementModifier(item: LineItem, option: ModifierOption, group: ModifierGroup): boolean {
  const idx = item.selected_modifiers.findIndex(m => m.id === option.id)
  const currentQty = idx === -1 ? 0 : (item.selected_modifiers[idx].quantity ?? 1)
  const optionLimit = Math.max(1, Number(option.max_limit) || 1)
  if (currentQty >= optionLimit) return false

  if (idx === -1) {
    const distinctInGroup = item.selected_modifiers.filter(m =>
      group.modifiers.some(o => o.id === m.id) && (m.quantity ?? 0) > 0
    ).length
    const groupLimit = Math.max(1, Number(group.max_qty) || 1)
    if (distinctInGroup >= groupLimit) return false
  }

  return true
}

function incrementModifier(item: LineItem, option: ModifierOption, group: ModifierGroup) {
  if (!canIncrementModifier(item, option, group)) return

  const idx = item.selected_modifiers.findIndex(m => m.id === option.id)
  if (idx === -1) {
    item.selected_modifiers.push({ ...option, quantity: 1 })
    return
  }

  const currentQty = item.selected_modifiers[idx].quantity ?? 1
  item.selected_modifiers[idx] = {
    ...item.selected_modifiers[idx],
    quantity: currentQty + 1,
  }
}

function decrementModifier(item: LineItem, option: ModifierOption) {
  const idx = item.selected_modifiers.findIndex(m => m.id === option.id)
  if (idx === -1) return

  const currentQty = item.selected_modifiers[idx].quantity ?? 1
  if (currentQty <= 1) {
    item.selected_modifiers.splice(idx, 1)
    return
  }

  item.selected_modifiers[idx] = {
    ...item.selected_modifiers[idx],
    quantity: currentQty - 1,
  }
}

function isModifierSelected(item: LineItem, modifierId: string) {
  return getModifierQty(item, modifierId) > 0
}

function missingRequiredModifierGroupForItem(item: LineItem) {
  return firstMissingRequiredModifierGroup(
    item.selected_modifiers,
    item.modifier_groups.map(group => ({
      id: group.id,
      name: group.name,
      isRequired: group.is_required,
      min_qty: group.min_qty,
      optionIds: group.modifiers.map(option => option.id),
    })),
  )
}

function notifyMissingRequiredGroup(group: { name: string }) {
  useToast().warning(t('ventas.crear.selectGroupBefore', { name: group.name }), {
    title: t('ventas.crear.modifierRequired'),
  })
}

// ─── Totals ───────────────────────────────────────────────────────────────────

function modifierTypeLabel(option: ModifierOption): string {
  const normalized = normalizeModifierOptionType(option.option_type)
  if (normalized === 'INGREDIENT') return t('ventas.crear.ingredient')
  if (normalized === 'RECIPE') return t('ventas.crear.recipe')
  if (normalized === 'PRODUCT') return t('ventas.crear.linkedProduct')
  if (normalized === 'NONE') return t('ventas.crear.priceOnly')
  return option.type_label || formatModifierOptionTypeLabel(normalized)
}

function itemTotal(item: LineItem) {
  return saleLineTotal(item.unit_price, item.quantity, item.selected_modifiers)
}

function modifierPriceLabel(option: ModifierOption): string {
  const included = Math.max(0, Number(option.included_quantity) || 0)
  return formatSaleModifierPriceLabel(option.price, formatCurrency, included, {
    included: t('ventas.crear.modifierIncluded', { count: included }),
    perAdditional: t('ventas.crear.perAdditional'),
    noAdditionalCost: t('ventas.crear.noAdditionalCost'),
  })
}

/** Multi-select cards: the "X incluida(s)" chip is rendered beside the option name,
 *  so the price label below the stepper should not repeat the included prefix. */
function modifierPriceLabelMulti(option: ModifierOption): string {
  return formatSaleModifierPriceLabel(Number(option.price) || 0, formatCurrency, 0, {
    perAdditional: t('ventas.crear.perAdditional'),
    noAdditionalCost: t('ventas.crear.noAdditionalCost'),
  })
}

const subtotal = computed(() =>
  form.value.items.reduce((sum, item) => sum + itemTotal(item), 0)
)

const discountInputNumber = computed(() => Number(discountInput.value))
const discountValidationError = computed(() => {
  if (!discountEnabled.value || !discountInput.value) return ''
  const value = discountInputNumber.value
  if (!Number.isFinite(value) || value <= 0) return t('ventas.crear.discountGtZero')
  if (discountType.value === 'percent' && value > 100) return t('ventas.crear.discountPctMax')
  if (discountType.value === 'fixed' && value > subtotal.value) return t('ventas.crear.discountFixedMax')
  return ''
})

const discountAmount = computed(() => {
  if (!discountEnabled.value || !discountInput.value || discountValidationError.value) return 0
  if (discountType.value === 'percent') return Math.round(subtotal.value * discountInputNumber.value / 100)
  return Math.min(subtotal.value, Math.round(discountInputNumber.value))
})

const total = computed(() => Math.max(0, subtotal.value - discountAmount.value))
const splitPaidTotal = computed(() => splitPayments.value.reduce((sum, payment) => sum + payment.amount, 0))
const splitRemaining = computed(() => Math.max(0, total.value - splitPaidTotal.value))
const splitIsComplete = computed(() =>
  splitMode.value && splitPayments.value.length > 0 && Math.abs(splitPaidTotal.value - total.value) <= 0.01
)
const splitAmountToAdd = computed(() => Number(splitAmountInput.value) || 0)
const currentPaymentIsWallet = computed(() => form.value.payment_method === WALLET_PAYMENT_SLUG)
const singlePaymentValidationError = computed(() => {
  if (splitMode.value) return ''
  if (!currentPaymentIsWallet.value) return ''
  if (!selectedCustomer.value) return t('ventas.crear.identifyForWallet')
  if (isAnonymousCustomer.value) return t('ventas.crear.walletNeedsCustomer')
  if (total.value > walletBalanceCop.value) return t('ventas.crear.walletInsufficient')
  return ''
})
const splitAmountValidationError = computed(() => {
  if (!splitMode.value || splitIsComplete.value) return ''
  if (splitAmountToAdd.value <= 0) return t('ventas.crear.amountGtZero')
  if (splitAmountToAdd.value - splitRemaining.value > 0.01) return t('ventas.crear.paymentExceeds')
  if (!currentPaymentIsWallet.value) return ''
  if (!selectedCustomer.value) return t('ventas.crear.identifyForWallet')
  if (isAnonymousCustomer.value) return t('ventas.crear.walletNeedsCustomer')
  if (splitAmountToAdd.value > walletBalanceCop.value) return t('ventas.crear.walletInsufficient')
  return ''
})

const canSubmit = computed(() =>
  form.value.items.length > 0 &&
  form.value.items.every(i => i.product_id && Number(i.quantity) > 0) &&
  !discountValidationError.value &&
  !singlePaymentValidationError.value &&
  (!splitMode.value || splitIsComplete.value) &&
  !loading.value &&
  !showWompiSlideover.value
)

const totalItemCount = computed(() =>
  form.value.items.reduce((sum, i) => sum + i.quantity, 0)
)

// ─── Currency ────────────────────────────────────────────────────────────────

const { formatCurrency } = useFormatters()

const mobileCartFormattedTotal = computed(() => formatCurrency(total.value))

function paymentLabel(payment: Pick<ManualSplitPayment, 'payment_method' | 'payment_method_id'>) {
  return resolveLabel(payment.payment_method, payment.payment_method_id)
}

function addSplitPayment() {
  if (splitAmountValidationError.value) {
    useToast().warning(splitAmountValidationError.value, { title: t('ventas.crear.splitPayment') })
    return
  }
  splitPayments.value.push({
    id: crypto.randomUUID(),
    amount: splitAmountToAdd.value,
    payment_method: form.value.payment_method,
    payment_method_id: form.value.payment_method_id,
  })
  splitAmountInput.value = splitRemaining.value > 0 ? Math.round(splitRemaining.value) : null
}

function removeSplitPayment(id: string) {
  splitPayments.value = splitPayments.value.filter(payment => payment.id !== id)
}

watch([total, splitMode], () => {
  splitPayments.value = []
  splitAmountInput.value = splitMode.value && total.value > 0 ? Math.round(total.value) : null
})

const { setMobileCart, setOpenCartHandler, setMobileCartSheetOpen, clearMobileCart } = usePosMobileCart()

watchEffect(() => {
  setMobileCart(totalItemCount.value, mobileCartFormattedTotal.value)
})

watch(showMobileCartSheet, (open) => {
  setMobileCartSheetOpen(open)
}, { immediate: true })

setOpenCartHandler(() => {
  if (totalItemCount.value === 0) return
  showMobileCartSheet.value = true
})

onUnmounted(() => {
  clearMobileCart()
  unsubscribeWompiPayment?.()
  unsubscribeWompiPayment = null
})

const selectedCustomerInitial = computed(() => {
  const customer = selectedCustomer.value
  return customer?.name?.charAt(0)?.toUpperCase() || customer?.phone_number?.charAt(0) || '?'
})
const selectedCustomerIdentity = computed(() =>
  buildCustomerIdentityPresentation(selectedCustomer.value),
)

// ─── Customer identification ────────────────────────────────────────────────

function onCustomerIdentified(customer: SelectedCustomer) {
  selectedCustomer.value = customer
  showCustomerModal.value = false
}

function clearCustomer() {
  selectedCustomer.value = null
}

watch(selectedCustomer, () => {
  splitPayments.value = splitPayments.value.filter(payment => payment.payment_method !== WALLET_PAYMENT_SLUG)
  if (form.value.payment_method !== WALLET_PAYMENT_SLUG) return
  const fallback = visiblePaymentGroups.value.find(group => group.slug !== WALLET_PAYMENT_SLUG)
  if (!fallback) return
  form.value.payment_method = fallback.slug
  form.value.payment_method_id = null
})

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submit() {
  if (showWompiSlideover.value) return
  if (!canSubmit.value) return
  if (isWompiTender.value && splitMode.value) {
    useToast().error('Wompi no admite cobro dividido. Cobra el total con Wompi.', { title: t('ventas.common.error') })
    return
  }
  const invalidItem = form.value.items.find(item => missingRequiredModifierGroupForItem(item))
  if (invalidItem) {
    const missingGroup = missingRequiredModifierGroupForItem(invalidItem)
    if (missingGroup) notifyMissingRequiredGroup(missingGroup)
    activeItemIndex.value = form.value.items.indexOf(invalidItem)
    return
  }
  loading.value = true
  try {
    // Convert the local-time input value (e.g. "2026-05-07T14:30") to a UTC
    // ISO string with explicit "+00:00" offset so the backend stores the
    // right moment. new Date(localStr) interprets the string as local time;
    // toISOString emits UTC with a "Z" suffix that Python 3.9 fromisoformat
    // does NOT accept — strip the "Z" + ms and append "+00:00".
    const orderDateUtc =
      new Date(form.value.order_date).toISOString().slice(0, 19) + '+00:00'

    const res = await $fetch<any>('/api/orders/manual', {
      method: 'POST',
      body: {
        order_date: orderDateUtc,
        payment_method: form.value.payment_method,
        payment_method_id: form.value.payment_method_id,
        customer_id: selectedCustomer.value?.id || undefined,
        ...(discountAmount.value > 0
          ? {
              discount_type: discountType.value,
              discount_value: discountInputNumber.value,
            }
          : {}),
        ...(splitMode.value
          ? {
              payment_method: splitPayments.value[0]?.payment_method ?? form.value.payment_method,
              payment_method_id: splitPayments.value[0]?.payment_method_id ?? null,
              payments: splitPayments.value.map(payment => ({
                amount: payment.amount,
                payment_method: payment.payment_method,
                payment_method_id: payment.payment_method_id,
              })),
            }
          : {}),
        ...(isWompiTender.value ? { wompi_collection: true } : {}),
        items: form.value.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          modifiers: i.selected_modifiers.map(m => ({
            id: m.id,
            name: m.name,
            price: m.price,
            quantity: m.quantity ?? 1
          }))
        }))
      }
    })
    if (isWompiTender.value) {
      wompiOrderId.value = res.data.id
      wompiAmount.value = Number(res.data.total_amount || total.value)
      showWompiSlideover.value = true
      return
    }
    useToast().success(t('ventas.crear.success'), { title: t('ventas.crear.successTitle') })
    await navigateTo(`/ventas/${res.data.id}`)
  } catch (err: any) {
    useToast().error(err?.data?.message || t('ventas.crear.error'), { title: t('ventas.common.error') })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-layout">

    <!-- Loading State -->
    <div v-if="loadingProducts" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <form
      v-else
      class="flex flex-col gap-4 pb-24 lg:pb-0"
      @submit.prevent="submit"
      novalidate
    >

      <!-- ── Compact Header ──────────────────────────────────────────────── -->
      <div class="rounded-xl border border-border bg-surface p-4">
        <!-- Date + customer + payment -->
        <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(16rem,1.3fr)_minmax(0,1fr)] gap-3">
          <div class="flex flex-col gap-1.5 min-w-0">
            <label for="order_date" class="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              {{ t('ventas.crear.dateLabel') }}
            </label>
            <input
              id="order_date"
              v-model="form.order_date"
              type="datetime-local"
              :max="new Date().toISOString().slice(0, 16)"
              required
              class="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div class="flex flex-col gap-1.5 min-w-0">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              {{ t('pos.customer.contactLabel') }}
            </span>
            <div
              v-if="selectedCustomer"
              class="min-h-10 w-full px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2"
            >
              <div class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {{ selectedCustomerInitial }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-text-primary truncate">
                  {{ selectedCustomer.name || t('ventas.crear.customerNoData') }}
                </p>
                <p class="text-xs text-text-secondary truncate">
                  {{ selectedCustomer.phone_number || t('ventas.common.sinTelefono') }}
                </p>
                <p
                  v-if="selectedCustomerIdentity.hasFiscalIdentity && !selectedCustomerIdentity.showSeparateAcquirer && selectedCustomerIdentity.acquirer.fiscalId"
                  class="text-xs text-text-secondary truncate"
                >
                  {{ [selectedCustomerIdentity.acquirer.fiscalIdType, selectedCustomerIdentity.acquirer.fiscalId].filter(Boolean).join(' ') }}
                </p>
                <div
                  v-if="selectedCustomerIdentity.showSeparateAcquirer"
                  class="mt-1 border-s-2 border-primary/30 ps-2"
                >
                  <p class="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                    {{ t('pos.customer.fiscalAcquirerLabel') }}
                  </p>
                  <p class="text-xs font-semibold text-text-primary break-words">
                    {{ selectedCustomerIdentity.acquirer.name }}
                  </p>
                  <p
                    v-if="selectedCustomerIdentity.acquirer.fiscalId"
                    class="text-xs text-text-secondary truncate"
                  >
                    {{ [selectedCustomerIdentity.acquirer.fiscalIdType, selectedCustomerIdentity.acquirer.fiscalId].filter(Boolean).join(' ') }}
                  </p>
                </div>
                <div
                  v-if="!isAnonymousCustomer"
                  class="flex flex-wrap gap-2 mt-1"
                  aria-live="polite"
                >
                  <div
                    v-if="isWalletPending"
                    class="h-5 w-[6.5rem] rounded-full bg-surface-secondary animate-pulse"
                    :aria-label="t('ventas.crear.walletLoading')"
                  />
                  <span
                    v-else
                    class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-state-success-bg text-state-success-text border border-state-success-border"
                  >
                    {{ t('ventas.crear.walletBalance', { amount: formatCurrency(walletBalanceCop) }) }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="h-7 px-2 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors shrink-0"
                @click="showCustomerModal = true"
              >
                {{ t('ventas.common.cambiar') }}
              </button>
              <button
                type="button"
                class="h-7 w-7 rounded-md text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                :aria-label="t('ventas.crear.removeCustomer')"
                @click="clearCustomer"
              >
                <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              v-else
              type="button"
              class="min-h-10 w-full px-3 py-2 rounded-lg border border-dashed border-border bg-background text-sm font-medium text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              @click="showCustomerModal = true"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <span>{{ t('ventas.crear.identifyCustomer') }}</span>
            </button>
          </div>
          <div class="flex flex-col gap-1.5 min-w-0">
            <label for="payment_method" class="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              {{ t('ventas.crear.paymentMethod') }}
            </label>
            <select
              id="payment_method"
              v-model="paymentSelectValue"
              required
              class="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <template v-for="g in visiblePaymentGroups" :key="g.id">
                <option :value="`${g.slug}:`">{{ groupLabel(g) }}</option>
                <optgroup v-if="g.methods && g.methods.length > 0" :label="groupLabel(g)">
                  <option v-for="m in g.methods" :key="m.id" :value="`${g.slug}:${m.id}`">
                    {{ groupLabel(g) }} · {{ m.name }}
                  </option>
                </optgroup>
              </template>
            </select>
          </div>
        </div>
      </div>

      <!-- ── POS Layout: grid left / cart right ─────────────────────────── -->
      <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6 lg:items-start flex flex-col gap-4 min-w-0">

        <!-- ── LEFT: Product Grid + Modifier Panel ───────────────────────── -->
        <div class="flex flex-col gap-4 min-w-0">

          <!-- Search and Filters -->
          <div class="flex flex-col gap-3 min-w-0">
            <UiSearchBar
              v-model="searchQuery"
              :placeholder="t('ventas.crear.searchProducts')"
            />
            <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1 min-w-0 max-w-full">
              <button
                v-for="cat in categories"
                :key="cat"
                type="button"
                class="px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap theme-transition"
                :class="selectedCategory === cat
                  ? 'bg-action-primary-bg text-action-primary-text shadow-md'
                  : 'bg-surface border border-border text-text-secondary hover:border-border hover:text-text-primary hover:bg-surface-secondary'"
                @click="selectedCategory = cat"
              >
                {{ cat === 'all' ? t('ventas.common.todos') : cat }}
              </button>
            </div>
          </div>

          <div
            v-if="!loadingProducts && filteredProducts.length === 0"
            class="order-3 flex flex-col items-center justify-center min-h-48 rounded-lg border border-dashed border-border bg-surface text-text-secondary px-4 py-8 text-center"
          >
            <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-sm font-medium text-text-primary">{{ t('ventas.crear.noProducts') }}</p>
            <p class="text-xs mt-1">{{ t('ventas.crear.noProductsHint') }}</p>
          </div>

          <!-- Product Grid -->
          <div v-else class="order-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-4 p-1 pb-4 min-w-0">
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              class="relative min-w-0"
            >
              <!-- Quantity badge -->
              <div
                v-if="cartQtyFor(product.id) > 0"
                class="absolute -top-2 -end-2 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm pointer-events-none"
                aria-hidden="true"
              >
                {{ cartQtyFor(product.id) }}
              </div>
              <PosProductCard
                class="w-full"
                :product="product"
                @select="selectProduct"
              />
            </div>
          </div>

          <!-- Product Detail Panel -->
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
                v-if="customizationItem"
                class="fixed inset-0 z-40 bg-black/40"
                aria-hidden="true"
                @click="closeCustomizationPanel"
              />
            </Transition>

            <Transition name="manual-product-panel">
              <div
                v-if="customizationItem"
                role="dialog"
                aria-modal="true"
                :aria-label="t('ventas.crear.personalize', { name: customizationProduct?.name ?? t('ventas.crear.productFallback') })"
                class="fixed z-50 flex flex-col bg-surface shadow-2xl
                       inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                       md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
              >
                <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
                </div>

                <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-4 md:px-6 py-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h2 class="text-base font-bold text-text-primary truncate">
                        {{ customizationProduct?.name }}
                      </h2>
                      <p class="text-xs text-text-secondary mt-0.5">
                        {{ t('ventas.crear.unitPrice', { amount: formatCurrency(customizationItem.unit_price) }) }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                      :aria-label="t('ventas.common.cerrarPanel')"
                      @click="closeCustomizationPanel"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
                  <div
                    v-if="customizationItem.modifier_groups.length > 0"
                    class="flex flex-col gap-5"
                  >
                    <section
                      v-for="group in customizationItem.modifier_groups"
                      :key="group.id"
                    >
                      <div class="flex items-center justify-between gap-2 mb-3">
                        <h3 class="text-sm font-bold text-text-primary">
                          {{ group.name }}
                          <span v-if="group.is_required || group.min_qty > 0" class="text-destructive" aria-hidden="true">*</span>
                        </h3>
                        <span class="text-xs font-medium bg-surface-secondary text-text-secondary px-2 py-1 rounded shrink-0">
                          <template v-if="group.min_qty > 1">{{ t('ventas.crear.minShort', { count: group.min_qty }) }} · </template>{{ t('ventas.crear.maxShort', { count: group.max_qty }) }}
                        </span>
                      </div>
                      <div v-if="isSingleSelectGroup(group)" class="grid grid-cols-2 gap-3">
                        <button
                          v-for="option in group.modifiers"
                          :key="option.id"
                          type="button"
                          class="border-2 rounded-xl p-3 text-start transition-all duration-200 bg-surface h-full flex flex-col gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          :class="isModifierSelected(customizationItem, option.id)
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/50'"
                          @click="selectRadioModifier(customizationItem, option, group)"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <span class="font-semibold text-text-primary text-sm leading-snug">{{ option.name }}</span>
                            <svg
                              class="h-5 w-5 shrink-0 text-primary transition-all"
                              :class="isModifierSelected(customizationItem, option.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
                              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"
                            >
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </div>
                          <span
                            class="text-xs font-semibold"
                            :class="saleModifierPriceClass(option.price)"
                          >
                            {{ modifierPriceLabel(option) }}
                          </span>
                          <span
                            v-if="modifierTypeLabel(option) !== t('ventas.crear.ingredient')"
                            class="text-xs text-text-tertiary"
                          >
                            {{ modifierTypeLabel(option) }}
                          </span>
                        </button>
                      </div>
                      <div v-else class="grid grid-cols-2 gap-3">
                        <div
                          v-for="option in group.modifiers"
                          :key="option.id"
                          class="border rounded-xl p-3 flex flex-col gap-3 transition-all bg-surface"
                          :class="isModifierSelected(customizationItem, option.id)
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border'"
                        >
                          <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-1.5">
                              <p class="font-medium text-text-primary text-sm leading-snug">{{ option.name }}</p>
                              <span
                                v-if="Number(option.included_quantity) > 0"
                                class="inline-flex items-center gap-1 text-[11px] font-semibold leading-none px-1.5 py-1 rounded bg-surface-secondary text-text-secondary"
                              >
                                <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                                </svg>
                                {{ t('ventas.crear.modifierIncluded', { count: Number(option.included_quantity) }) }}
                              </span>
                            </div>
                            <p
                              class="text-xs font-semibold mt-0.5"
                              :class="saleModifierPriceClass(option.price)"
                            >
                              {{ modifierPriceLabelMulti(option) }}
                            </p>
                            <p
                              v-if="modifierTypeLabel(option) !== t('ventas.crear.ingredient')"
                              class="text-xs text-text-tertiary mt-0.5"
                            >
                              {{ modifierTypeLabel(option) }}
                            </p>
                          </div>
                          <div
                            class="flex items-center justify-between w-full rounded-xl border border-border/80 bg-surface-secondary/40 p-0.5"
                            :class="getModifierQty(customizationItem, option.id) > 0 ? 'border-primary/30' : ''"
                          >
                            <button
                              type="button"
                              class="flex-1 min-h-[40px] flex items-center justify-center text-lg font-medium text-text-secondary hover:bg-surface hover:text-text-primary rounded-lg transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                              :disabled="getModifierQty(customizationItem, option.id) <= 0"
                              :aria-label="t('ventas.crear.reduce', { name: option.name })"
                              @click="decrementModifier(customizationItem, option)"
                            >
                              −
                            </button>
                            <span
                              class="min-w-[2rem] px-1 text-center text-sm font-semibold tabular-nums"
                              :class="getModifierQty(customizationItem, option.id) > 0 ? 'text-primary' : 'text-text-secondary'"
                            >
                              {{ getModifierQty(customizationItem, option.id) }}
                            </span>
                            <button
                              type="button"
                              class="flex-1 min-h-[40px] flex items-center justify-center text-lg font-medium text-text-secondary hover:bg-surface hover:text-primary rounded-lg transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                              :disabled="!canIncrementModifier(customizationItem, option, group)"
                              :aria-label="t('ventas.crear.increase', { name: option.name })"
                              @click="incrementModifier(customizationItem, option, group)"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <p
                    v-else
                    class="text-sm text-text-secondary"
                  >
                    {{ t('ventas.crear.noAdditions') }}
                  </p>
                </div>

                <div
                  v-if="pendingItem"
                  class="flex-shrink-0 border-t border-border bg-surface px-4 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <span class="text-sm font-semibold text-primary tabular-nums">
                    {{ formatCurrency(itemTotal(pendingItem)) }}
                  </span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="h-10 px-4 rounded-lg border border-border bg-background text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                      @click="closeProductDetail"
                    >
                      {{ t('ventas.common.cancelar') }}
                    </button>
                    <button
                      type="button"
                      class="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                      @click="confirmProductDetail"
                    >
                      {{ t('ventas.crear.addToCart') }}
                    </button>
                  </div>
                </div>

                <div
                  v-else-if="activeItem"
                  class="flex-shrink-0 border-t border-border bg-surface px-4 md:px-6 py-3 flex justify-end"
                >
                  <button
                    type="button"
                    class="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                    @click="closeCustomizationPanel"
                  >
                    {{ t('ventas.common.listo') }}
                  </button>
                </div>
              </div>
            </Transition>
          </Teleport>

        </div><!-- end left -->

        <!-- ── RIGHT: Desktop Cart Panel ─────────────────────────────────── -->
        <div class="hidden lg:flex min-w-0 flex-col rounded-xl border border-border bg-surface overflow-hidden sticky top-4 shadow-sm">

          <!-- Cart header -->
          <div class="px-4 py-3 border-b border-border bg-primary flex items-center justify-between">
            <h2 class="text-sm font-semibold text-primary-foreground">{{ t('ventas.crear.orderTitle') }}</h2>
            <span class="text-xs bg-primary-foreground/15 text-primary-foreground rounded-full px-2.5 py-0.5 font-medium tabular-nums">
              {{ t(totalItemCount === 1 ? 'ventas.crear.unitCountOne' : 'ventas.crear.unitCountMany', { count: totalItemCount }) }}
            </span>
          </div>

          <!-- Cart items (scrollable) -->
          <div class="flex-1 overflow-y-auto max-h-[46vh] p-3 flex flex-col gap-2">
            <!-- Empty state -->
            <div
              v-if="form.items.length === 0"
              class="py-12 flex flex-col items-center text-center text-text-secondary"
            >
              <svg class="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p class="text-sm">{{ t('ventas.crear.selectProduct') }}</p>
            </div>

            <!-- Cart item rows -->
            <div
              v-for="(item, index) in form.items"
              :key="item.product_id + index"
              class="rounded-lg border border-border/70 bg-background/60 p-3"
            >
              <div class="flex items-start gap-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-text-primary leading-snug">{{ itemDisplayName(item) }}</p>
                  <p class="text-xs text-text-secondary mt-0.5">{{ t('ventas.crear.unitPrice', { amount: formatCurrency(item.unit_price) }) }}</p>
                  <p v-if="item.notes" class="text-xs text-text-tertiary mt-0.5 truncate">{{ item.notes }}</p>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(itemTotal(item)) }}</span>
                  <button
                    type="button"
                    class="text-destructive/80 hover:text-destructive transition-colors p-0.5"
                    :aria-label="t('ventas.crear.removeItem', { name: itemDisplayName(item) })"
                    @click="removeItem(index)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="item.selected_modifiers.length > 0" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="mod in item.selected_modifiers"
                  :key="mod.id"
                  class="text-[11px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md"
                >
                  {{ mod.name }}<template v-if="(mod.quantity ?? 1) > 1"> ×{{ mod.quantity }}</template>
                  · {{ formatCurrency(modifierLineTotal(mod)) }}
                </span>
              </div>

              <div class="mt-2.5 flex items-center gap-1">
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                  :aria-label="t('ventas.crear.reduceQty', { name: itemDisplayName(item) })"
                  @click="decrementItem(index)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                  </svg>
                </button>
                <span class="min-w-8 text-center text-sm font-semibold text-text-primary tabular-nums select-none">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                  :aria-label="t('ventas.crear.increaseQty', { name: itemDisplayName(item) })"
                  @click="incrementItem(index)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Total + Submit (desktop) -->
          <div class="p-4 border-t border-border flex flex-col gap-3 bg-surface">
            <div class="flex flex-wrap gap-2">
              <button
                v-if="showOpenSaleButton"
                type="button"
                class="h-8 px-3 rounded-lg text-xs font-semibold border border-border text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                :aria-disabled="!openSaleEnabled"
                :title="openSaleDisabledReason ?? undefined"
                @click="handleOpenSaleClick"
              >
                + {{ t('pos.cart.openSale') }}
              </button>
              <button
                type="button"
                class="h-8 px-3 rounded-lg text-xs font-semibold border transition-colors"
                :class="discountEnabled
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary'"
                @click="discountEnabled = !discountEnabled"
              >
                {{ t('ventas.common.descuento') }}
              </button>
              <button
                type="button"
                class="h-8 px-3 rounded-lg text-xs font-semibold border transition-colors"
                :class="splitMode
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary'"
                @click="splitMode = !splitMode"
              >
                {{ t('ventas.crear.splitAction') }}
              </button>
            </div>

            <div v-if="discountEnabled" class="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{{ t('ventas.common.descuento') }}</span>
                <button
                  type="button"
                  class="text-xs font-semibold text-text-secondary hover:text-destructive transition-colors"
                  @click="discountEnabled = false"
                >
                  {{ t('ventas.common.quitar') }}
                </button>
              </div>
              <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                <select
                  v-model="discountType"
                  class="h-9 px-2 rounded-lg border border-border bg-background text-sm text-text-primary"
                >
                  <option value="percent">{{ t('ventas.common.porcentaje') }}</option>
                  <option value="fixed">{{ t('ventas.crear.fixedCop') }}</option>
                </select>
                <input
                  v-model="discountInput"
                  type="number"
                  min="0"
                  :max="discountType === 'percent' ? 100 : Math.round(subtotal)"
                  class="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text-primary"
                  :placeholder="discountType === 'percent' ? '10' : '5000'"
                />
              </div>
              <p v-if="discountValidationError" class="text-xs text-destructive">{{ discountValidationError }}</p>
              <div v-if="discountAmount > 0" class="flex items-center justify-between text-sm text-primary">
                <span>{{ t('ventas.common.descuentoManual') }}</span>
                <span class="font-semibold tabular-nums">-{{ formatCurrency(discountAmount) }}</span>
              </div>
            </div>

            <div v-if="splitMode" class="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{{ t('ventas.crear.splitPayment') }}</span>
                <button
                  type="button"
                  class="text-xs font-semibold text-text-secondary hover:text-destructive transition-colors"
                  @click="splitMode = false"
                >
                  {{ t('ventas.common.quitar') }}
                </button>
              </div>
              <div v-if="splitPayments.length > 0" class="flex flex-col gap-1">
                <div
                  v-for="payment in splitPayments"
                  :key="payment.id"
                  class="flex items-center justify-between gap-2 text-sm"
                >
                  <span class="truncate text-text-secondary">{{ paymentLabel(payment) }}</span>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-text-primary tabular-nums">{{ formatCurrency(payment.amount) }}</span>
                    <button type="button" class="text-destructive text-xs font-semibold" @click="removeSplitPayment(payment.id)">{{ t('ventas.common.quitar') }}</button>
                  </div>
                </div>
              </div>
              <div v-if="!splitIsComplete" class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  v-model.number="splitAmountInput"
                  type="number"
                  min="1"
                  :max="Math.round(splitRemaining)"
                  class="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text-primary"
                  :placeholder="t('ventas.crear.amountPlaceholder')"
                />
                <button
                  type="button"
                  class="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  :disabled="!!splitAmountValidationError"
                  @click="addSplitPayment"
                >
                  {{ t('ventas.common.agregar') }}
                </button>
              </div>
              <p v-if="splitAmountValidationError" class="text-xs text-destructive">{{ splitAmountValidationError }}</p>
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-secondary">{{ splitIsComplete ? t('ventas.crear.paymentComplete') : t('ventas.crear.remainingBalance') }}</span>
                <span class="font-semibold tabular-nums" :class="splitIsComplete ? 'text-state-success-text' : 'text-primary'">{{ formatCurrency(splitRemaining) }}</span>
              </div>
            </div>

            <div class="rounded-lg bg-background border border-border px-3 py-2.5 flex flex-col gap-1">
              <div v-if="subtotal !== total" class="flex items-center justify-between">
                <span class="text-xs text-text-secondary">{{ t('ventas.common.subtotal') }}</span>
                <span class="text-xs font-medium text-text-secondary tabular-nums">{{ formatCurrency(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-text-primary">{{ t('ventas.common.total') }}</span>
                <span class="text-xl font-bold text-primary tabular-nums">{{ formatCurrency(total) }}</span>
              </div>
            </div>
            <p v-if="singlePaymentValidationError" class="text-xs text-destructive">{{ singlePaymentValidationError }}</p>
            <button
              type="submit"
              :disabled="!canSubmit"
              class="h-12 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all
                     hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                     active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {{ t('ventas.crear.registering') }}
              </span>
              <span v-else>
                {{ t('ventas.crear.registerWithAmount', { amount: formatCurrency(total) }) }}
              </span>
            </button>
          </div>

        </div><!-- end right panel -->

      </div><!-- end POS grid -->

      <!-- ── Mobile: Cart Bottom Sheet ───────────────────────────────────── -->
      <UiBottomSheetModal
        v-model="showMobileCartSheet"
        :title="t('ventas.crear.currentOrder')"
        max-height="xl"
      >
        <div class="p-4 flex flex-col gap-2">
          <div
            v-if="form.items.length === 0"
            class="py-10 flex flex-col items-center text-center text-text-secondary"
          >
            <svg class="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-sm">{{ t('ventas.crear.selectProduct') }}</p>
          </div>

          <template v-else>
            <div
              v-for="(item, index) in form.items"
              :key="item.product_id + index"
              class="rounded-lg border border-border/70 bg-background/60 p-3"
            >
              <div class="flex items-start gap-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-text-primary leading-snug">{{ itemDisplayName(item) }}</p>
                  <p class="text-xs text-text-secondary mt-0.5">{{ t('ventas.crear.unitPrice', { amount: formatCurrency(item.unit_price) }) }}</p>
                  <p v-if="item.notes" class="text-xs text-text-tertiary mt-0.5 truncate">{{ item.notes }}</p>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(itemTotal(item)) }}</span>
                  <button
                    type="button"
                    class="text-destructive/80 hover:text-destructive transition-colors p-0.5"
                    :aria-label="t('ventas.crear.removeItem', { name: itemDisplayName(item) })"
                    @click="removeItem(index)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="item.selected_modifiers.length > 0" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="mod in item.selected_modifiers"
                  :key="mod.id"
                  class="text-[11px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md"
                >
                  {{ mod.name }}<template v-if="(mod.quantity ?? 1) > 1"> ×{{ mod.quantity }}</template>
                  · {{ formatCurrency(modifierLineTotal(mod)) }}
                </span>
              </div>

              <div class="mt-2.5 flex items-center gap-1">
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                  :aria-label="t('ventas.crear.reduceQty', { name: itemDisplayName(item) })"
                  @click="decrementItem(index)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                  </svg>
                </button>
                <span class="min-w-8 text-center text-sm font-semibold text-text-primary tabular-nums select-none">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                  :aria-label="t('ventas.crear.increaseQty', { name: itemDisplayName(item) })"
                  @click="incrementItem(index)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </template>
        </div>

        <template #footer>
          <div class="p-4 flex flex-col gap-3">
            <div class="flex flex-wrap gap-2">
              <button
                v-if="showOpenSaleButton"
                type="button"
                class="h-8 px-3 rounded-lg text-xs font-semibold border border-border text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                :aria-disabled="!openSaleEnabled"
                :title="openSaleDisabledReason ?? undefined"
                @click="handleOpenSaleClick"
              >
                + {{ t('pos.cart.openSale') }}
              </button>
              <button
                type="button"
                class="h-8 px-3 rounded-lg text-xs font-semibold border transition-colors"
                :class="discountEnabled
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary'"
                @click="discountEnabled = !discountEnabled"
              >
                {{ t('ventas.common.descuento') }}
              </button>
              <button
                type="button"
                class="h-8 px-3 rounded-lg text-xs font-semibold border transition-colors"
                :class="splitMode
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary'"
                @click="splitMode = !splitMode"
              >
                {{ t('ventas.crear.splitAction') }}
              </button>
            </div>

            <div v-if="discountEnabled" class="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{{ t('ventas.common.descuento') }}</span>
                <button
                  type="button"
                  class="text-xs font-semibold text-text-secondary hover:text-destructive transition-colors"
                  @click="discountEnabled = false"
                >
                  {{ t('ventas.common.quitar') }}
                </button>
              </div>
              <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                <select v-model="discountType" class="h-9 px-2 rounded-lg border border-border bg-background text-sm text-text-primary">
                  <option value="percent">{{ t('ventas.common.porcentaje') }}</option>
                  <option value="fixed">{{ t('ventas.crear.fixedCop') }}</option>
                </select>
                <input
                  v-model="discountInput"
                  type="number"
                  min="0"
                  :max="discountType === 'percent' ? 100 : Math.round(subtotal)"
                  class="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text-primary"
                  :placeholder="discountType === 'percent' ? '10' : '5000'"
                />
              </div>
              <p v-if="discountValidationError" class="text-xs text-destructive">{{ discountValidationError }}</p>
              <div v-if="discountAmount > 0" class="flex items-center justify-between text-sm text-primary">
                <span>{{ t('ventas.common.descuentoManual') }}</span>
                <span class="font-semibold tabular-nums">-{{ formatCurrency(discountAmount) }}</span>
              </div>
            </div>

            <div v-if="splitMode" class="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{{ t('ventas.crear.splitPayment') }}</span>
                <button
                  type="button"
                  class="text-xs font-semibold text-text-secondary hover:text-destructive transition-colors"
                  @click="splitMode = false"
                >
                  {{ t('ventas.common.quitar') }}
                </button>
              </div>
              <div v-for="payment in splitPayments" :key="payment.id" class="flex items-center justify-between gap-2 text-sm">
                <span class="truncate text-text-secondary">{{ paymentLabel(payment) }}</span>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-text-primary tabular-nums">{{ formatCurrency(payment.amount) }}</span>
                  <button type="button" class="text-destructive text-xs font-semibold" @click="removeSplitPayment(payment.id)">{{ t('ventas.common.quitar') }}</button>
                </div>
              </div>
              <div v-if="!splitIsComplete" class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  v-model.number="splitAmountInput"
                  type="number"
                  min="1"
                  :max="Math.round(splitRemaining)"
                  class="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text-primary"
                  :placeholder="t('ventas.crear.amountPlaceholder')"
                />
                <button
                  type="button"
                  class="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  :disabled="!!splitAmountValidationError"
                  @click="addSplitPayment"
                >
                  {{ t('ventas.common.agregar') }}
                </button>
              </div>
              <p v-if="splitAmountValidationError" class="text-xs text-destructive">{{ splitAmountValidationError }}</p>
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-secondary">{{ splitIsComplete ? t('ventas.crear.paymentComplete') : t('ventas.crear.remainingBalance') }}</span>
                <span class="font-semibold tabular-nums" :class="splitIsComplete ? 'text-state-success-text' : 'text-primary'">{{ formatCurrency(splitRemaining) }}</span>
              </div>
            </div>

            <div class="rounded-lg bg-background border border-border px-3 py-2.5 flex flex-col gap-1">
              <div v-if="subtotal !== total" class="flex items-center justify-between">
                <span class="text-xs text-text-secondary">{{ t('ventas.common.subtotal') }}</span>
                <span class="text-xs font-medium text-text-secondary tabular-nums">{{ formatCurrency(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-text-primary">{{ t('ventas.common.total') }}</span>
                <span class="text-xl font-bold text-primary tabular-nums">{{ formatCurrency(total) }}</span>
              </div>
            </div>
            <p v-if="singlePaymentValidationError" class="text-xs text-destructive">{{ singlePaymentValidationError }}</p>
            <button
              type="button"
              :disabled="!canSubmit"
              class="h-12 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all
                     hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                     active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              @click="submit"
            >
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {{ t('ventas.crear.registering') }}
              </span>
              <span v-else>
                {{ t('ventas.crear.registerWithAmount', { amount: formatCurrency(total) }) }}
              </span>
            </button>
          </div>
        </template>
      </UiBottomSheetModal>

    </form>

    <Teleport to="body">
      <PosCustomerIdentificationModal
        v-model="showCustomerModal"
        @customer-identified="onCustomerIdentified"
        @fiscal-updated="onCustomerIdentified"
      />
      <PosWompiCollectionSlideover
        v-model="showWompiSlideover"
        :order-id="wompiOrderId"
        :amount="wompiAmount"
        :customer-id="selectedCustomer?.id"
        :email="selectedCustomer?.email"
        @approved="onWompiCollectionApproved"
      />
    </Teleport>

    <PosOpenSaleModal
      ref="openSaleModalRef"
      v-model="openSaleModalOpen"
      :shell-name="openSaleProduct?.name"
      @confirm="handleOpenSaleConfirm"
    />
  </div>
</template>

<style scoped>
.manual-product-panel-enter-active,
.manual-product-panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.manual-product-panel-enter-from,
.manual-product-panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .manual-product-panel-enter-from,
  .manual-product-panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
