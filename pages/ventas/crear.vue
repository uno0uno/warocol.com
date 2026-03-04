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

// ─── Line item helpers ────────────────────────────────────────────────────────

function addItem() {
  form.value.items.push({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    modifier_groups: [],
    selected_modifiers: []
  })
}

function removeItem(index: number) {
  form.value.items.splice(index, 1)
}

function onProductChange(index: number) {
  const item = form.value.items[index]
  const product = products.value.find((p: any) => p.id === item.product_id)
  if (product) {
    item.unit_price = Number(product.price) || 0
    item.modifier_groups = product.modifier_groups || []
    item.selected_modifiers = []
  }
}

function toggleModifier(item: LineItem, option: ModifierOption, group: ModifierGroup) {
  const idx = item.selected_modifiers.findIndex(m => m.id === option.id)
  if (idx !== -1) {
    item.selected_modifiers.splice(idx, 1)
    return
  }
  // Enforce max_qty per group
  const countInGroup = item.selected_modifiers.filter(m =>
    group.modifiers.some(o => o.id === m.id)
  ).length
  if (countInGroup >= group.max_qty) {
    // Remove oldest in group
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

    <form v-else class="flex flex-col gap-6" @submit.prevent="submit" novalidate>

      <!-- Header -->
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/ventas"
          class="flex items-center justify-center w-9 h-9 rounded-lg border border-border hover:bg-surface-secondary transition-colors"
          aria-label="Volver a ventas"
        >
          <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-xl font-bold text-text-primary">Nueva venta manual</h1>
          <p class="text-sm text-text-secondary">Registra una venta que ocurrió fuera del POS</p>
        </div>
      </div>

      <!-- Sale details -->
      <div class="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 class="text-base font-semibold text-text-primary">Detalles de la venta</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label for="order_date" class="text-sm font-medium text-text-primary">
              Fecha y hora <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="order_date"
              v-model="form.order_date"
              type="datetime-local"
              :max="new Date().toISOString().slice(0, 16)"
              required
              class="h-10 px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label for="payment_method" class="text-sm font-medium text-text-primary">
              Método de pago <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <select
              id="payment_method"
              v-model="form.payment_method"
              required
              class="h-10 px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="digital">Digital</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Products -->
      <div class="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 class="text-base font-semibold text-text-primary">Productos</h2>
        <p class="text-sm text-text-secondary -mt-2">Agrega los productos incluidos en esta venta</p>

        <!-- Line items -->
        <div v-if="form.items.length > 0" class="flex flex-col gap-3">
          <div
            v-for="(item, index) in form.items"
            :key="index"
            class="flex flex-col gap-3 p-4 bg-surface-secondary rounded-lg border border-border"
          >
            <!-- Product row -->
            <div class="flex items-start gap-3">
              <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">

                <!-- Product selector -->
                <div class="flex flex-col gap-1 sm:col-span-2">
                  <label :for="`product-${index}`" class="text-sm font-medium text-text-secondary">
                    Producto
                  </label>
                  <select
                    :id="`product-${index}`"
                    v-model="item.product_id"
                    required
                    class="h-10 px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    @change="onProductChange(index)"
                  >
                    <option value="" disabled>Seleccione producto</option>
                    <option v-for="p in products" :key="p.id" :value="p.id">
                      {{ p.name }} ({{ formatCurrency(p.price) }})
                    </option>
                  </select>
                </div>

                <!-- Quantity -->
                <div class="flex flex-col gap-1">
                  <label :for="`qty-${index}`" class="text-sm font-medium text-text-secondary">
                    Cantidad
                  </label>
                  <input
                    :id="`qty-${index}`"
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    class="h-10 px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <!-- Subtotal + delete -->
              <div class="flex flex-col items-end gap-1 pt-5 shrink-0">
                <span v-if="item.unit_price" class="text-xs text-text-secondary whitespace-nowrap">
                  {{ formatCurrency(item.unit_price) }} c/u
                </span>
                <span class="text-sm font-semibold text-primary whitespace-nowrap">
                  {{ formatCurrency(itemTotal(item)) }}
                </span>
                <button
                  type="button"
                  class="flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  :aria-label="`Eliminar producto ${index + 1}`"
                  @click="removeItem(index)"
                >
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span class="hidden sm:inline text-xs">Eliminar</span>
                </button>
              </div>
            </div>

            <!-- Modifier groups (shown when product has modifiers) -->
            <template v-if="item.modifier_groups.length > 0">
              <div
                v-for="group in item.modifier_groups"
                :key="group.id"
                class="flex flex-col gap-2"
              >
                <p class="text-sm font-medium text-text-secondary">
                  {{ group.name }}
                  <span v-if="group.is_required" class="text-destructive">*</span>
                  <span class="normal-case font-normal ml-1">(máx. {{ group.max_qty }})</span>
                </p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in group.modifiers"
                    :key="option.id"
                    type="button"
                    class="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all"
                    :class="isModifierSelected(item, option.id)
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border bg-background text-text-primary hover:border-primary/50'"
                    @click="toggleModifier(item, option, group)"
                  >
                    <svg
                      class="w-3.5 h-3.5 transition-all"
                      :class="isModifierSelected(item, option.id) ? 'text-primary' : 'text-text-secondary'"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                    >
                      <path
                        v-if="isModifierSelected(item, option.id)"
                        stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                      <path
                        v-else
                        stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>{{ option.name }}</span>
                    <span v-if="option.price > 0" class="text-xs text-text-secondary">
                      +{{ formatCurrency(option.price) }}
                    </span>
                    <span v-else-if="option.price === 0" class="text-xs text-text-secondary">
                      Incluido
                    </span>
                  </button>
                </div>
              </div>

              <!-- Selected modifiers summary -->
              <div v-if="item.selected_modifiers.length > 0" class="flex flex-wrap gap-1">
                <span
                  v-for="mod in item.selected_modifiers"
                  :key="mod.id"
                  class="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                >
                  {{ mod.name }}{{ mod.price > 0 ? ` +${formatCurrency(mod.price)}` : '' }}
                </span>
              </div>
            </template>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="flex flex-col items-center justify-center py-8 text-center text-text-secondary border border-dashed border-border rounded-lg"
        >
          <svg class="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p class="text-sm">Agrega al menos un producto</p>
        </div>

        <!-- Add product -->
        <button
          type="button"
          class="flex items-center justify-center gap-2 h-10 w-full rounded-lg border-2 border-dashed border-border text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
          @click="addItem"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Agregar producto
        </button>
      </div>

      <!-- Total + Submit -->
      <div class="rounded-xl border border-primary bg-primary/5 p-5 flex items-center justify-between gap-4">
        <div>
          <p class="text-sm text-text-secondary">Total</p>
          <p class="text-2xl font-bold text-primary">{{ formatCurrency(total) }}</p>
        </div>

        <button
          type="submit"
          :disabled="!canSubmit"
          class="h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-all
                 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <span v-if="loading" class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Registrando...
          </span>
          <span v-else>Registrar venta</span>
        </button>
      </div>

    </form>
  </div>
</template>
