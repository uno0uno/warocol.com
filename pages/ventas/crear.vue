<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Nueva Venta' })

import { modifiersCartTotal, formatSaleModifierPriceLabel, mapApiModifierToSaleOption, normalizeModifierOptionType } from '~/utils/saleModifierOption'
import { formatModifierOptionTypeLabel } from '~/composables/useModifierOptionForm'
import {
  WALLET_PAYMENT_SLUG,
  mergePosPaymentGroupsFromApi,
  type ApiPaymentGroup,
  type PosPaymentGroup,
} from '~/utils/paymentDefaults'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModifierOption {
  id: string
  name: string
  price: number
  quantity?: number
  max_limit?: number
  option_type?: string
  type_label?: string
}

interface ModifierGroup {
  id: string
  name: string
  is_required: boolean
  max_qty: number
  modifiers: ModifierOption[]
}

interface LineItem {
  product_id: string
  quantity: number
  unit_price: number
  modifier_groups: ModifierGroup[]
  selected_modifiers: ModifierOption[]
}

interface SelectedCustomer {
  id: string
  name: string | null
  phone_number: string | null
  email: string | null
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
      category: p.category_name || p.category?.name || p.category || 'Sin categoría',
      category_id: p.category_id ?? null,
      image: p.image || '🍽️',
      image_url: p.image_url || null,
      available: p.is_available !== false,
      is_resale: p.is_resale || false,
      modifier_groups: p.modifier_groups || [],
    }))
})

const categories = computed(() => {
  const cats = new Set(products.value.map((p: any) => p.category || 'Sin categoría'))
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

// ─── Modifier helpers ─────────────────────────────────────────────────────────

function getModifierQty(item: LineItem, modifierId: string): number {
  return item.selected_modifiers.find(m => m.id === modifierId)?.quantity ?? 0
}

function isSingleSelectGroup(group: ModifierGroup): boolean {
  return Math.max(1, Number(group.max_qty) || 1) === 1
}

function selectRadioModifier(item: LineItem, option: ModifierOption, group: ModifierGroup) {
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

// ─── Totals ───────────────────────────────────────────────────────────────────

function modifierTypeLabel(option: ModifierOption): string {
  return option.type_label || formatModifierOptionTypeLabel(normalizeModifierOptionType(option.option_type))
}

function itemTotal(item: LineItem) {
  const base = Number(item.quantity) * Number(item.unit_price)
  return base + modifiersCartTotal(item.selected_modifiers)
}

const total = computed(() =>
  form.value.items.reduce((sum, item) => sum + itemTotal(item), 0)
)

const canSubmit = computed(() =>
  form.value.items.length > 0 &&
  form.value.items.every(i => i.product_id && Number(i.quantity) > 0) &&
  !loading.value
)

const totalItemCount = computed(() =>
  form.value.items.reduce((sum, i) => sum + i.quantity, 0)
)

// ─── Currency ────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

const mobileCartFormattedTotal = computed(() => formatCurrency(total.value))

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
})

const selectedCustomerInitial = computed(() => {
  const customer = selectedCustomer.value
  return customer?.name?.charAt(0)?.toUpperCase() || customer?.phone_number?.charAt(0) || '?'
})

// ─── Customer identification ────────────────────────────────────────────────

function onCustomerIdentified(customer: SelectedCustomer) {
  selectedCustomer.value = customer
  showCustomerModal.value = false
}

function clearCustomer() {
  selectedCustomer.value = null
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submit() {
  if (!canSubmit.value) return
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
    useToast().success('Venta registrada correctamente', { title: 'Venta creada' })
    await navigateTo(`/ventas/${res.data.id}`)
  } catch (err: any) {
    useToast().error(err?.data?.message || 'Error al registrar la venta', { title: 'Error' })
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
      <div class="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
        <!-- Row 1: back + title -->
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/ventas"
            class="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border border-border hover:bg-surface-secondary transition-colors"
            aria-label="Volver a ventas"
          >
            <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </NuxtLink>
          <h1 class="text-base font-bold text-text-primary">Nueva venta manual</h1>
        </div>
        <!-- Row 2: date + payment + customer -->
        <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(16rem,1.3fr)] gap-2">
          <input
            id="order_date"
            v-model="form.order_date"
            type="datetime-local"
            :max="new Date().toISOString().slice(0, 16)"
            required
            aria-label="Fecha y hora de la venta"
            class="h-9 w-full px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            id="payment_method"
            v-model="paymentSelectValue"
            required
            aria-label="Método de pago"
            class="h-9 w-full px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <template v-for="g in visiblePaymentGroups" :key="g.id">
              <!-- Group default option (when no specific method picked) -->
              <option :value="`${g.slug}:`">{{ g.name }}</option>
              <!-- Specific methods nested under the group -->
              <optgroup v-if="g.methods && g.methods.length > 0" :label="g.name">
                <option v-for="m in g.methods" :key="m.id" :value="`${g.slug}:${m.id}`">
                  {{ g.name }} · {{ m.name }}
                </option>
              </optgroup>
            </template>
          </select>
          <div
            v-if="selectedCustomer"
            class="min-h-9 w-full px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2"
          >
            <div class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {{ selectedCustomerInitial }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-text-primary truncate">
                {{ selectedCustomer.name || 'Cliente sin datos' }}
              </p>
              <p class="text-xs text-text-secondary truncate">
                {{ selectedCustomer.phone_number || 'Sin teléfono' }}
              </p>
              <div
                v-if="!isAnonymousCustomer"
                class="flex flex-wrap gap-2 mt-1"
                aria-live="polite"
              >
                <div
                  v-if="isWalletPending"
                  class="h-5 w-[6.5rem] rounded-full bg-surface-secondary animate-pulse"
                  aria-label="Cargando saldo wallet"
                />
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-state-success-bg text-state-success-text border border-state-success-border"
                >
                  Wallet: {{ formatCurrency(walletBalanceCop) }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="h-7 px-2 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors shrink-0"
              @click="showCustomerModal = true"
            >
              Cambiar
            </button>
            <button
              type="button"
              class="h-7 w-7 rounded-md text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              aria-label="Quitar cliente"
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
            class="min-h-9 w-full px-3 py-2 rounded-lg border border-dashed border-border bg-background text-sm font-medium text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
            @click="showCustomerModal = true"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <span>Identificar cliente</span>
          </button>
        </div>
      </div>

      <!-- ── POS Layout: grid left / cart right ─────────────────────────── -->
      <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 lg:items-start flex flex-col gap-4 min-w-0">

        <!-- ── LEFT: Product Grid + Modifier Panel ───────────────────────── -->
        <div class="flex flex-col gap-4 min-w-0">

          <!-- Search and Filters -->
          <div class="flex flex-col gap-3 min-w-0">
            <UiSearchBar
              v-model="searchQuery"
              placeholder="Buscar productos..."
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
                {{ cat === 'all' ? 'Todos' : cat }}
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
            <p class="text-sm font-medium text-text-primary">No hay productos disponibles</p>
            <p class="text-xs mt-1">Ajusta la búsqueda o cambia de categoría</p>
          </div>

          <!-- Product Grid -->
          <div v-else class="order-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-4 p-1 pb-4 min-w-0">
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              class="relative min-w-0"
            >
              <!-- Quantity badge -->
              <div
                v-if="cartQtyFor(product.id) > 0"
                class="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm pointer-events-none"
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
                :aria-label="`Personalizar ${customizationProduct?.name ?? 'producto'}`"
                class="fixed z-50 flex flex-col bg-surface shadow-2xl
                       inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                       md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
              >
                <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
                </div>

                <div class="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
                  <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <h2 class="text-sm font-semibold text-text-primary truncate">
                        {{ customizationProduct?.name }}
                      </h2>
                      <p class="text-xs text-text-secondary">
                        {{ formatCurrency(customizationItem.unit_price) }} c/u
                      </p>
                    </div>
                    <button
                      type="button"
                      class="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded min-h-[32px]"
                      @click="closeCustomizationPanel"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div
                    v-if="customizationItem.modifier_groups.length > 0"
                    class="flex flex-col gap-3"
                  >
                    <div
                      v-for="group in customizationItem.modifier_groups"
                      :key="group.id"
                      class="flex flex-col gap-2"
                    >
                      <p class="text-sm font-medium text-text-secondary">
                        {{ group.name }}
                        <span v-if="group.is_required" class="text-destructive" aria-hidden="true">*</span>
                        <span class="normal-case font-normal ml-1 text-xs">(máx. {{ group.max_qty }})</span>
                      </p>
                      <div v-if="isSingleSelectGroup(group)" class="flex flex-wrap gap-2">
                        <button
                          v-for="option in group.modifiers"
                          :key="option.id"
                          type="button"
                          class="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          :class="isModifierSelected(customizationItem, option.id)
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border bg-background text-text-primary hover:border-primary/50'"
                          @click="selectRadioModifier(customizationItem, option, group)"
                        >
                          <svg
                            class="w-3.5 h-3.5 shrink-0"
                            :class="isModifierSelected(customizationItem, option.id) ? 'text-primary' : 'text-text-secondary'"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                          >
                            <path
                              v-if="isModifierSelected(customizationItem, option.id)"
                              stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
                            />
                            <path
                              v-else
                              stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"
                            />
                          </svg>
                          {{ option.name }}
                          <span
                            v-if="modifierTypeLabel(option) !== 'Ingrediente'"
                            class="text-[10px] uppercase tracking-wide text-text-tertiary"
                          >
                            {{ modifierTypeLabel(option) }}
                          </span>
                          <span
                            class="text-xs"
                            :class="option.price < 0 ? 'text-success' : 'text-text-secondary'"
                          >
                            {{ formatSaleModifierPriceLabel(option.price, formatCurrency) }}
                          </span>
                        </button>
                      </div>
                      <div v-else class="grid grid-cols-1 gap-2">
                        <div
                          v-for="option in group.modifiers"
                          :key="option.id"
                          class="rounded-lg border bg-background p-3 transition-all"
                          :class="isModifierSelected(customizationItem, option.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border'"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                              <p class="text-sm font-medium text-text-primary truncate">{{ option.name }}</p>
                              <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span
                                  v-if="modifierTypeLabel(option) !== 'Ingrediente'"
                                  class="text-[10px] uppercase tracking-wide text-text-tertiary"
                                >
                                  {{ modifierTypeLabel(option) }}
                                </span>
                                <span
                                  class="text-xs"
                                  :class="option.price < 0 ? 'text-success' : 'text-text-secondary'"
                                >
                                  {{ formatSaleModifierPriceLabel(option.price, formatCurrency) }}
                                </span>
                              </div>
                            </div>
                            <div class="flex items-center rounded-lg border border-border bg-surface-secondary/40 p-0.5 shrink-0">
                              <button
                                type="button"
                                class="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                                :disabled="getModifierQty(customizationItem, option.id) <= 0"
                                :aria-label="`Reducir ${option.name}`"
                                @click="decrementModifier(customizationItem, option)"
                              >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                                </svg>
                              </button>
                              <span
                                class="w-7 text-center text-sm font-semibold tabular-nums"
                                :class="getModifierQty(customizationItem, option.id) > 0 ? 'text-primary' : 'text-text-secondary'"
                              >
                                {{ getModifierQty(customizationItem, option.id) }}
                              </span>
                              <button
                                type="button"
                                class="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-primary transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                                :disabled="!canIncrementModifier(customizationItem, option, group)"
                                :aria-label="`Aumentar ${option.name}`"
                                @click="incrementModifier(customizationItem, option, group)"
                              >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p
                    v-else
                    class="text-sm text-text-secondary"
                  >
                    Este producto no tiene adiciones configuradas.
                  </p>

                  <div
                    v-if="pendingItem"
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-primary/20 pt-4"
                  >
                    <span class="text-sm font-semibold text-primary">
                      {{ formatCurrency(itemTotal(pendingItem)) }}
                    </span>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="h-10 px-4 rounded-lg border border-border bg-background text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                        @click="closeProductDetail"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        class="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                        @click="confirmProductDetail"
                      >
                        Agregar al carrito
                      </button>
                    </div>
                  </div>

                  <div
                    v-else-if="activeItem"
                    class="flex justify-end border-t border-primary/20 pt-4"
                  >
                    <button
                      type="button"
                      class="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                      @click="closeCustomizationPanel"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </Teleport>

        </div><!-- end left -->

        <!-- ── RIGHT: Desktop Cart Panel ─────────────────────────────────── -->
        <div class="hidden lg:flex min-w-0 flex-col rounded-xl border border-border bg-surface overflow-hidden sticky top-4">

          <!-- Cart header -->
          <div class="px-4 py-3 border-b border-border bg-primary flex items-center justify-between">
            <h2 class="text-sm font-semibold text-primary-foreground">Orden</h2>
            <span class="text-xs bg-primary-foreground/10 text-primary-foreground rounded-full px-2 py-0.5 font-medium">
              {{ totalItemCount }} {{ totalItemCount === 1 ? 'unidad' : 'unidades' }}
            </span>
          </div>

          <!-- Cart items (scrollable) -->
          <div class="flex-1 overflow-y-auto max-h-[50vh] p-4 flex flex-col gap-3">
            <!-- Empty state -->
            <div
              v-if="form.items.length === 0"
              class="py-10 flex flex-col items-center text-center text-text-secondary"
            >
              <svg class="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p class="text-sm">Selecciona un producto</p>
            </div>

            <!-- Cart item rows -->
            <div
              v-for="(item, index) in form.items"
              :key="item.product_id + index"
              class="flex items-start gap-3 py-2 border-b border-border last:border-0"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-text-primary truncate">{{ productFor(item)?.name }}</p>
                <p class="text-xs text-text-secondary">{{ formatCurrency(item.unit_price) }} c/u</p>
                <div v-if="item.selected_modifiers.length > 0" class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="mod in item.selected_modifiers"
                    :key="mod.id"
                    class="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full"
                  >
                    {{ mod.name }}<template v-if="(mod.quantity ?? 1) > 1"> ×{{ mod.quantity }}</template>
                  </span>
                </div>
              </div>

              <!-- Qty controls -->
              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                  :aria-label="`Reducir cantidad de ${productFor(item)?.name ?? 'producto'}`"
                  @click="decrementItem(index)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                  </svg>
                </button>
                <span class="w-6 text-center text-sm font-semibold text-text-primary select-none">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                  :aria-label="`Aumentar cantidad de ${productFor(item)?.name ?? 'producto'}`"
                  @click="incrementItem(index)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <!-- Item total + remove -->
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="text-sm font-semibold text-primary">{{ formatCurrency(itemTotal(item)) }}</span>
                <button
                  type="button"
                  class="text-destructive hover:text-destructive/70 transition-colors p-0.5"
                  :aria-label="`Eliminar ${productFor(item)?.name ?? 'producto'}`"
                  @click="removeItem(index)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Total + Submit (desktop) -->
          <div class="p-4 border-t border-border flex flex-col gap-3 bg-surface">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Total</span>
              <span class="text-2xl font-bold text-primary">{{ formatCurrency(total) }}</span>
            </div>
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
                Registrando...
              </span>
              <span v-else>
                Registrar · {{ formatCurrency(total) }}
              </span>
            </button>
          </div>

        </div><!-- end right panel -->

      </div><!-- end POS grid -->

      <!-- ── Mobile: Cart Bottom Sheet ───────────────────────────────────── -->
      <UiBottomSheetModal
        v-model="showMobileCartSheet"
        title="Orden actual"
        max-height="xl"
      >
        <div class="p-4 flex flex-col gap-3">
          <div
            v-if="form.items.length === 0"
            class="py-10 flex flex-col items-center text-center text-text-secondary"
          >
            <svg class="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-sm">Selecciona un producto</p>
          </div>

          <template v-else>
            <div
              v-for="(item, index) in form.items"
              :key="item.product_id + index"
              class="flex items-start gap-3 py-2 border-b border-border last:border-0"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-text-primary truncate">{{ productFor(item)?.name }}</p>
                <p class="text-xs text-text-secondary">{{ formatCurrency(item.unit_price) }} c/u</p>
                <div v-if="item.selected_modifiers.length > 0" class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="mod in item.selected_modifiers"
                    :key="mod.id"
                    class="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full"
                  >
                    {{ mod.name }}<template v-if="(mod.quantity ?? 1) > 1"> ×{{ mod.quantity }}</template>
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                  :aria-label="`Reducir cantidad de ${productFor(item)?.name ?? 'producto'}`"
                  @click="decrementItem(index)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                  </svg>
                </button>
                <span class="w-7 text-center text-sm font-semibold text-text-primary select-none">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                  :aria-label="`Aumentar cantidad de ${productFor(item)?.name ?? 'producto'}`"
                  @click="incrementItem(index)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="text-sm font-semibold text-primary">{{ formatCurrency(itemTotal(item)) }}</span>
                <button
                  type="button"
                  class="text-destructive hover:text-destructive/70 transition-colors p-0.5"
                  :aria-label="`Eliminar ${productFor(item)?.name ?? 'producto'}`"
                  @click="removeItem(index)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </template>
        </div>

        <template #footer>
          <div class="p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Total</span>
              <span class="text-2xl font-bold text-primary">{{ formatCurrency(total) }}</span>
            </div>
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
                Registrando...
              </span>
              <span v-else>
                Registrar · {{ formatCurrency(total) }}
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
    </Teleport>
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
