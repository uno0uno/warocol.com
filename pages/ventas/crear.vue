<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Nueva Venta' })

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModifierOption {
  id: string
  name: string
  price: number
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

// ─── State ───────────────────────────────────────────────────────────────────

const loading = ref(false)
const activeItemIndex = ref<number | null>(null)

const form = ref({
  order_date: new Date().toISOString().slice(0, 16),
  payment_method: 'cash',
  items: [] as LineItem[]
})

// ─── Products catalog ─────────────────────────────────────────────────────────

const { data: productsData, pending: loadingProducts } = useFetch('/api/menu/products', {
  query: { is_available: true, limit: 250, include_modifiers: true }
})

const products = computed(() => productsData.value?.data ?? [])

// ─── Computed helpers ─────────────────────────────────────────────────────────

const activeItem = computed(() =>
  activeItemIndex.value !== null ? form.value.items[activeItemIndex.value] : null
)

// ─── POS cart helpers ─────────────────────────────────────────────────────────

function addProductToCart(product: any) {
  if (!product) return
  // Always create a new line item (same product can appear multiple times with different modifiers)
  form.value.items.push({
    product_id: product.id,
    quantity: 1,
    unit_price: Number(product.price) || 0,
    modifier_groups: product.modifier_groups || [],
    selected_modifiers: []
  })
  const newIdx = form.value.items.length - 1
  if (form.value.items[newIdx].modifier_groups.length > 0) {
    activeItemIndex.value = newIdx
  }
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

function toggleModifier(item: LineItem, option: ModifierOption, group: ModifierGroup) {
  const idx = item.selected_modifiers.findIndex(m => m.id === option.id)
  if (idx !== -1) {
    item.selected_modifiers.splice(idx, 1)
    return
  }
  const countInGroup = item.selected_modifiers.filter(m =>
    group.modifiers.some(o => o.id === m.id)
  ).length
  if (countInGroup >= group.max_qty) {
    const oldestIdx = item.selected_modifiers.findIndex(m =>
      group.modifiers.some(o => o.id === m.id)
    )
    if (oldestIdx !== -1) item.selected_modifiers.splice(oldestIdx, 1)
  }
  item.selected_modifiers.push(option)
}

function isModifierSelected(item: LineItem, modifierId: string) {
  return item.selected_modifiers.some(m => m.id === modifierId)
}

// ─── Totals ───────────────────────────────────────────────────────────────────

function itemTotal(item: LineItem) {
  const base = Number(item.quantity) * Number(item.unit_price)
  const extras = item.selected_modifiers.reduce((s, m) => s + Number(m.price), 0)
  return base + extras
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

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  try {
    const res = await $fetch<any>('/api/orders/manual', {
      method: 'POST',
      body: {
        order_date: form.value.order_date,
        payment_method: form.value.payment_method,
        items: form.value.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          modifiers: i.selected_modifiers.map(m => ({
            id: m.id,
            name: m.name,
            price: m.price
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
      <div class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <NuxtLink
          to="/ventas"
          class="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border border-border hover:bg-surface-secondary transition-colors"
          aria-label="Volver a ventas"
        >
          <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <h1 class="text-base font-bold text-text-primary flex-1 min-w-0">Nueva venta manual</h1>
        <div class="flex flex-wrap items-center gap-2">
          <input
            id="order_date"
            v-model="form.order_date"
            type="datetime-local"
            :max="new Date().toISOString().slice(0, 16)"
            required
            aria-label="Fecha y hora de la venta"
            class="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            id="payment_method"
            v-model="form.payment_method"
            required
            aria-label="Método de pago"
            class="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="digital">Digital</option>
          </select>
        </div>
      </div>

      <!-- ── POS Layout: grid left / cart right ─────────────────────────── -->
      <div class="lg:grid lg:grid-cols-[1fr_22rem] lg:gap-6 lg:items-start flex flex-col gap-4">

        <!-- ── LEFT: Product Grid + Modifier Panel ───────────────────────── -->
        <div class="flex flex-col gap-4">

          <!-- Product Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="product in products"
              :key="product.id"
              class="relative"
            >
              <!-- Quantity badge -->
              <div
                v-if="cartQtyFor(product.id) > 0"
                class="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm pointer-events-none"
                aria-hidden="true"
              >
                {{ cartQtyFor(product.id) }}
              </div>
              <button
                type="button"
                class="w-full flex flex-col items-center p-3 sm:p-4 border-2 rounded-xl bg-surface transition-all hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                :class="cartQtyFor(product.id) > 0
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'"
                :aria-label="`Agregar ${product.name} — ${formatCurrency(product.price)}`"
                @click="addProductToCart(product)"
              >
                <span class="text-3xl sm:text-4xl mb-1.5" aria-hidden="true">{{ product.image }}</span>
                <span class="text-xs sm:text-sm font-medium text-text-primary text-center leading-tight line-clamp-2">
                  {{ product.name }}
                </span>
                <span class="text-sm sm:text-base font-bold text-primary mt-1">
                  {{ formatCurrency(product.price) }}
                </span>
              </button>
            </div>
          </div>

          <!-- Modifier Expansion Panel -->
          <div
            v-if="activeItem && activeItem.modifier_groups.length > 0"
            class="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-4"
          >
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold text-text-primary">
                Adiciones — {{ productFor(activeItem)?.name }}
              </h2>
              <button
                type="button"
                class="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded min-h-[32px]"
                @click="activeItemIndex = null"
              >
                Cerrar
              </button>
            </div>

            <div
              v-for="group in activeItem.modifier_groups"
              :key="group.id"
              class="flex flex-col gap-2"
            >
              <p class="text-sm font-medium text-text-secondary">
                {{ group.name }}
                <span v-if="group.is_required" class="text-destructive" aria-hidden="true">*</span>
                <span class="normal-case font-normal ml-1 text-xs">(máx. {{ group.max_qty }})</span>
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in group.modifiers"
                  :key="option.id"
                  type="button"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  :class="isModifierSelected(activeItem, option.id)
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-background text-text-primary hover:border-primary/50'"
                  @click="toggleModifier(activeItem, option, group)"
                >
                  <svg
                    class="w-3.5 h-3.5 shrink-0"
                    :class="isModifierSelected(activeItem, option.id) ? 'text-primary' : 'text-text-secondary'"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                  >
                    <path
                      v-if="isModifierSelected(activeItem, option.id)"
                      stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
                    />
                    <path
                      v-else
                      stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {{ option.name }}
                  <span v-if="option.price > 0" class="text-xs text-text-secondary">
                    +{{ formatCurrency(option.price) }}
                  </span>
                  <span v-else class="text-xs text-text-secondary">Incluido</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── Mobile: Inline Cart ───────────────────────────────────── -->
          <div v-if="form.items.length > 0" class="lg:hidden rounded-xl border border-border bg-surface flex flex-col">
            <!-- Cart header -->
            <div class="px-4 py-3 border-b border-border bg-primary flex items-center justify-between rounded-t-xl">
              <h2 class="text-sm font-semibold text-primary-foreground">Orden</h2>
              <span class="text-xs bg-primary-foreground/10 text-primary-foreground rounded-full px-2 py-0.5 font-medium">
                {{ totalItemCount }} {{ totalItemCount === 1 ? 'unidad' : 'unidades' }}
              </span>
            </div>
            <!-- Items -->
            <div class="p-4 flex flex-col gap-3">
              <div
                v-for="(item, index) in form.items"
                :key="item.product_id + index"
                class="flex items-start gap-3"
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
                      {{ mod.name }}
                    </span>
                  </div>
                </div>
                <!-- Qty controls -->
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                    :aria-label="`Reducir cantidad`"
                    @click="decrementItem(index)"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                  </button>
                  <span class="w-7 text-center text-sm font-semibold text-text-primary">{{ item.quantity }}</span>
                  <button
                    type="button"
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition-colors"
                    :aria-label="`Aumentar cantidad`"
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
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div><!-- end left -->

        <!-- ── RIGHT: Desktop Cart Panel ─────────────────────────────────── -->
        <div class="hidden lg:flex flex-col rounded-xl border border-border bg-surface overflow-hidden sticky top-4">

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
                    {{ mod.name }}
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

      <!-- ── Mobile: Sticky Bottom Submit ───────────────────────────────── -->
      <div class="lg:hidden fixed bottom-0 inset-x-0 z-30 p-4 bg-surface border-t border-border">
        <button
          type="submit"
          :disabled="!canSubmit"
          class="h-12 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all
                 hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Registrando...
          </span>
          <span v-else-if="totalItemCount === 0">Selecciona un producto</span>
          <span v-else>Registrar · {{ formatCurrency(total) }}</span>
        </button>
      </div>

    </form>
  </div>
</template>
