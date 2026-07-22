<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] bg-black/40"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <!-- Panel: bottom sheet on mobile, slide-over on desktop -->
    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="headerTitle"
        class="fixed z-[101] flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <!-- Hero image -->
        <div
          v-if="!wizardMode"
          class="flex-shrink-0 w-full aspect-[16/10] max-h-48 bg-surface-secondary overflow-hidden border-b border-border"
        >
          <div v-if="isLoading" class="w-full h-full animate-pulse bg-surface-secondary" />
          <img
            v-else-if="heroImageUrl"
            :src="heroImageUrl"
            :alt="heroAlt"
            class="w-full h-full object-cover object-center"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-6xl bg-surface-secondary">
            {{ heroEmoji }}
          </div>
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight truncate">
                  {{ headerTitle }}
                </h2>
                <p v-if="headerSubtitle" class="text-xs text-text-secondary leading-snug mt-0.5 line-clamp-2">
                  {{ headerSubtitle }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Cerrar"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Wizard progress dots -->
        <div v-if="wizardMode" class="wizard-progress">
          <span
            v-for="i in quantity"
            :key="i"
            class="wizard-dot"
            :class="{ active: i - 1 === wizardStep, done: i - 1 < wizardStep }"
          />
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <!-- Skeleton while loading -->
          <template v-if="isLoading">
            <div class="skeleton skeleton-title" />
            <div class="skeleton skeleton-line" />
            <div class="skeleton skeleton-line short" />
            <div class="skeleton skeleton-group" />
            <div class="skeleton skeleton-group" />
          </template>

          <!-- Generic fetch error (e.g. product no longer exists) -->
          <template v-else-if="fetchError">
            <div class="unavailable-banner unavailable-banner--error">
              <div class="unavailable-icon-wrap unavailable-icon-wrap--error">
                <Icon name="heroicons:exclamation-triangle" class="unavailable-icon" aria-hidden="true" />
              </div>
              <p class="unavailable-title">Producto no disponible</p>
              <p class="unavailable-msg">Este producto ya no está disponible. Por favor recarga el menú.</p>
            </div>
          </template>

          <!-- Product disabled for online orders -->
          <template v-else-if="productDetail && isProductUnavailable">
            <div class="unavailable-banner unavailable-banner--offline">
              <div class="unavailable-icon-wrap unavailable-icon-wrap--offline">
                <Icon name="heroicons:x-circle" class="unavailable-icon" aria-hidden="true" />
              </div>
              <p class="unavailable-title">{{ unavailableTitle }}</p>
              <p class="unavailable-msg">{{ unavailableMessage }}</p>
            </div>
          </template>

          <template v-else-if="productDetail">
            <!-- Description -->
            <p v-if="productDetail.description && !wizardMode" class="product-description">
              {{ productDetail.description }}
            </p>

            <!-- Prep time -->
            <p v-if="productDetail.preparation_time && !wizardMode" class="product-prep-time">
              ⏱️ {{ productDetail.preparation_time }} min de preparación
            </p>

            <!-- Modifier groups — reads from activeModifiers proxy -->
            <div
              v-for="group in productDetail.modifier_groups"
              :key="group.id"
              class="modifier-group"
            >
              <div class="group-header">
                <span class="group-name">{{ group.name }}</span>
                <span v-if="group.is_required" class="group-required">Obligatorio</span>
                <span v-else class="group-optional">Opcional</span>
              </div>
              <p v-if="group.max_qty > 1" class="group-hint">
                Elige hasta {{ group.max_qty }}
              </p>

              <div class="group-options">
                <!-- Radio (single choice) -->
                <template v-if="group.max_qty === 1">
                  <label
                    v-for="mod in availableModifiers(group)"
                    :key="mod.id"
                    class="option-label"
                  >
                    <input
                      type="radio"
                      :name="`group-${group.id}-step-${wizardStep}`"
                      :value="mod.id"
                      :checked="isSelected(mod.id)"
                      @change="selectRadio(group, mod)"
                      class="option-input"
                    />
                    <span class="option-name">{{ mod.name }}</span>
                    <span class="option-meta">
                      <span
                        class="option-price"
                        :class="{
                          'option-price-free': mod.price === 0,
                          'option-price-discount': mod.price < 0,
                        }"
                      >
                        {{ formatModifierPriceLabel(mod) }}
                      </span>
                    </span>
                  </label>
                </template>

                <!-- Stepper (multi-choice with per-modifier quantity) -->
                <template v-else>
                  <div
                    v-for="mod in availableModifiers(group)"
                    :key="mod.id"
                    class="option-label"
                    :class="{ 'option-disabled': getModifierQty(mod.id) <= 0 && !canIncrementModifier(mod, group.id) }"
                  >
                    <span class="option-name">{{ mod.name }}</span>
                    <span class="option-meta">
                      <span
                        class="option-price"
                        :class="{
                          'option-price-free': mod.price === 0,
                          'option-price-discount': mod.price < 0,
                        }"
                      >
                        {{ formatModifierPriceLabel(mod) }}
                      </span>
                    </span>
                    <span class="modifier-stepper" @click.stop>
                      <button
                        type="button"
                        class="modifier-stepper-btn"
                        :disabled="getModifierQty(mod.id) <= 0"
                        :aria-label="`Reducir ${mod.name}`"
                        @click="decrementModifier(mod)"
                      >−</button>
                      <span
                        class="modifier-stepper-value"
                        :class="{ active: getModifierQty(mod.id) > 0 }"
                      >
                        {{ getModifierQty(mod.id) }}
                      </span>
                      <button
                        type="button"
                        class="modifier-stepper-btn"
                        :disabled="!canIncrementModifier(mod, group.id)"
                        :aria-label="`Aumentar ${mod.name}`"
                        @click="incrementModifier(mod, group.id)"
                      >+</button>
                    </span>
                  </div>
                </template>
              </div>
            </div>

            <!-- Notes -->
            <div class="notes-section">
              <label class="notes-label">
                {{ wizardMode ? `Instrucciones para ítem ${wizardStep + 1}` : 'Instrucciones especiales' }}
              </label>
              <textarea
                :value="activeNotes"
                @input="activeNotes = ($event.target as HTMLTextAreaElement).value"
                class="notes-input"
                placeholder="Ej: Sin cebolla, extra salsa..."
                rows="2"
              />
            </div>

            <!-- Quantity selector — hidden while navigating wizard steps -->
            <div v-if="!wizardMode" class="quantity-section">
              <span class="quantity-label">Cantidad</span>
              <div class="quantity-controls">
                <button
                  class="qty-btn"
                  :disabled="quantity <= 1"
                  @click="quantity = Math.max(1, quantity - 1)"
                >−</button>
                <span class="qty-value">{{ quantity }}</span>
                <button class="qty-btn" @click="quantity++">+</button>
              </div>
            </div>

            <!-- "Configurar individualmente" toggle — only when qty > 1 and has modifier groups -->
            <div
              v-if="quantity > 1 && productDetail.modifier_groups.length > 0 && !wizardMode"
              class="wizard-toggle-section"
            >
              <label class="wizard-toggle-label">
                <div class="toggle-switch" :class="{ on: wizardPending }" @click="enableWizard">
                  <div class="toggle-knob" />
                </div>
                <span>Personalizar cada uno individualmente</span>
              </label>
              <p class="wizard-toggle-hint">
                Configura adiciones distintas para cada unidad
              </p>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4 flex flex-col gap-2">
          <template v-if="wizardMode">
            <div class="flex gap-2">
              <button
                type="button"
                class="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="wizardStep === 0"
                @click="wizardStep--"
              >
                ← Anterior
              </button>
              <button
                v-if="wizardStep < quantity - 1"
                type="button"
                class="flex-1 h-11 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-primary/30"
                :disabled="!isValid"
                @click="goToNextStep"
              >
                Siguiente →
              </button>
              <button
                v-else
                type="button"
                class="flex-1 h-11 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-primary/30"
                :disabled="!isValid || cartStore.isLoading"
                @click="handleAddToCart"
              >
                <span v-if="cartStore.isLoading">Agregando...</span>
                <span v-else>Agregar {{ quantity }} — {{ totalPrice }}</span>
              </button>
            </div>
          </template>

          <div v-else class="flex gap-2">
            <button
              type="button"
              class="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="flex-1 h-11 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-primary/30"
              :disabled="!isValid || cartStore.isLoading || isLoading || fetchError || isProductUnavailable"
              @click="handleAddToCart"
            >
              <span v-if="cartStore.isLoading">Agregando...</span>
              <span v-else>Agregar {{ quantity }} al carrito — {{ totalPrice }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useOnlineCartStore, type CartModifier } from '~/stores/online_cart'
import { useTableQrCartStore } from '~/stores/table_qr_cart'
import {
  formatSaleModifierPriceLabel,
  modifiersCartTotal,
} from '~/utils/saleModifierOption'
import {
  canIncrementModifierSelection,
  modifierGroupSelectionCount,
  modifierSelectionQty,
} from '~/utils/modifierSelection'

interface Modifier {
  id: string
  name: string
  price: number
  is_available: boolean
  is_default: boolean
  max_limit: number
  included_quantity?: number
  option_type?: string
}

interface ModifierGroup {
  id: string
  name: string
  is_required: boolean
  min_qty: number
  max_qty: number
  modifiers: Modifier[]
}

interface ProductDetail {
  id: string
  name: string
  price: number
  description?: string
  preparation_time?: number
  image_url?: string
  is_available_online?: boolean
  is_available_table_qr?: boolean
  modifier_groups: ModifierGroup[]
}

interface WizardUnit {
  modifiers: CartModifier[]
  notes: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  product: Record<string, any> | null
  tenantSlug: string
  channel?: 'online' | 'table-qr'
  tableQrToken?: string
}>(), {
  channel: 'online',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const productDetail = ref<ProductDetail | null>(null)

const onlineCartStore = useOnlineCartStore()
const tableQrCartStore = useTableQrCartStore()
const cartStore = computed(() =>
  props.channel === 'table-qr' ? tableQrCartStore : onlineCartStore,
)

const heroImageUrl = computed(() => {
  const url = productDetail.value?.image_url ?? props.product?.image_url
  return typeof url === 'string' && url.startsWith('http') ? url : null
})

const heroEmoji = computed(() => {
  const url = productDetail.value?.image_url ?? props.product?.image_url
  return typeof url === 'string' && url && !url.startsWith('http') ? url : '🍽️'
})

const heroAlt = computed(() =>
  productDetail.value?.name ?? props.product?.name ?? 'Producto',
)

const headerTitle = computed(() => {
  if (wizardMode.value) return `Ítem ${wizardStep.value + 1} de ${quantity.value}`
  return productDetail.value?.name ?? props.product?.name ?? ''
})

const isProductUnavailable = computed(() => {
  if (!productDetail.value) return false
  if (props.channel === 'table-qr') {
    return productDetail.value.is_available_table_qr === false
  }
  return productDetail.value.is_available_online === false
})

const unavailableTitle = computed(() =>
  props.channel === 'table-qr' ? 'No disponible en mesa (QR)' : 'No disponible para domicilios',
)
const unavailableMessage = computed(() =>
  props.channel === 'table-qr'
    ? 'Este producto no está disponible para pedido en mesa en este momento.'
    : 'Este producto no está disponible para pedidos en línea en este momento.',
)
const isLoading = ref(false)
const fetchError = ref(false)
const selectedModifiers = ref<CartModifier[]>([])
const quantity = ref(1)
const notes = ref('')

// Wizard state
const wizardMode = ref(false)
const wizardPending = ref(false)  // toggle visual state before entering wizard
const wizardStep = ref(0)
const wizardUnits = ref<WizardUnit[]>([])

// --- Helpers ---

function getDefaultModifiers(): CartModifier[] {
  if (!productDetail.value) return []
  const defaults: CartModifier[] = []
  for (const group of productDetail.value.modifier_groups) {
    for (const mod of group.modifiers) {
      if (mod.is_default && mod.is_available) {
        defaults.push({
          id: mod.id,
          name: mod.name,
          price: mod.price,
          quantity: 1,
          included_quantity: mod.included_quantity,
        })
      }
    }
  }
  return defaults
}

function buildWizardUnits(qty: number): WizardUnit[] {
  return Array.from({ length: qty }, () => ({
    modifiers: getDefaultModifiers(),
    notes: '',
  }))
}

// --- Active step proxies ---
// In wizard mode: read/write from wizardUnits[wizardStep]
// In normal mode: read/write from selectedModifiers / notes

const activeStepModifiers = computed<CartModifier[]>({
  get() {
    if (wizardMode.value && wizardUnits.value[wizardStep.value]) {
      return wizardUnits.value[wizardStep.value].modifiers
    }
    return selectedModifiers.value
  },
  set(val) {
    if (wizardMode.value && wizardUnits.value[wizardStep.value]) {
      wizardUnits.value[wizardStep.value].modifiers = val
    } else {
      selectedModifiers.value = val
    }
  },
})

const activeNotes = computed<string>({
  get() {
    if (wizardMode.value && wizardUnits.value[wizardStep.value]) {
      return wizardUnits.value[wizardStep.value].notes
    }
    return notes.value
  },
  set(val) {
    if (wizardMode.value && wizardUnits.value[wizardStep.value]) {
      wizardUnits.value[wizardStep.value].notes = val
    } else {
      notes.value = val
    }
  },
})

// --- Fetch product detail on open ---

watch(() => props.modelValue, async (val) => {
  if (val && props.product) {
    isLoading.value = true
    fetchError.value = false
    selectedModifiers.value = []
    quantity.value = 1
    notes.value = ''
    productDetail.value = null
    wizardMode.value = false
    wizardPending.value = false
    wizardStep.value = 0
    wizardUnits.value = []
    try {
      const url = props.channel === 'table-qr' && props.tableQrToken
        ? `/api/public/table-qr/${props.tableQrToken}/product/${props.product.id}`
        : `/api/public/restaurant/${props.tenantSlug}/product/${props.product.id}`
      const res = await $fetch<{ data: ProductDetail }>(url)
      productDetail.value = res.data
      // Pre-select defaults
      for (const group of res.data.modifier_groups) {
        for (const mod of group.modifiers) {
          if (mod.is_default && mod.is_available) {
            selectedModifiers.value.push({
              id: mod.id,
              name: mod.name,
              price: mod.price,
              quantity: 1,
              included_quantity: mod.included_quantity,
            })
          }
        }
      }
    } catch (err) {
      console.error('Error fetching product detail:', err)
      fetchError.value = true
    } finally {
      isLoading.value = false
    }
  } else if (!val) {
    productDetail.value = null
    fetchError.value = false
    selectedModifiers.value = []
    quantity.value = 1
    notes.value = ''
    wizardMode.value = false
    wizardPending.value = false
    wizardStep.value = 0
    wizardUnits.value = []
  }
})

// Resize wizardUnits when quantity changes in wizard mode
watch(quantity, (newQty) => {
  if (!wizardMode.value) return
  if (newQty > wizardUnits.value.length) {
    while (wizardUnits.value.length < newQty) {
      wizardUnits.value.push({ modifiers: [], notes: '' })
    }
  } else {
    wizardUnits.value = wizardUnits.value.slice(0, newQty)
    if (wizardStep.value >= newQty) wizardStep.value = newQty - 1
  }
})

function goToNextStep() {
  wizardStep.value++
}

// --- Wizard enable ---

function enableWizard() {
  wizardPending.value = !wizardPending.value
  if (wizardPending.value) {
    // Step 0 starts with the current selection (defaults); remaining steps start empty
    wizardUnits.value = Array.from({ length: quantity.value }, (_, i) => ({
      modifiers: i === 0 ? [...selectedModifiers.value] : [],
      notes: i === 0 ? notes.value : '',
    }))
    wizardStep.value = 0
    wizardMode.value = true
  } else {
    // Exit wizard: restore first unit's state back to normal mode
    if (wizardUnits.value[0]) {
      selectedModifiers.value = [...wizardUnits.value[0].modifiers]
      notes.value = wizardUnits.value[0].notes
    }
    wizardMode.value = false
    wizardUnits.value = []
    wizardStep.value = 0
  }
}

// --- Modifier helpers (read from active step proxy) ---

function availableModifiers(group: ModifierGroup): Modifier[] {
  return group.modifiers.filter(m => m.is_available)
}

function isSelected(modId: string): boolean {
  return getModifierQty(modId) > 0
}

function groupSelectionCount(groupId: string): number {
  if (!productDetail.value) return 0
  const group = productDetail.value.modifier_groups.find(g => g.id === groupId)
  if (!group) return 0
  return modifierGroupSelectionCount(
    activeStepModifiers.value,
    group.modifiers.map(m => m.id),
  )
}

function selectRadio(group: ModifierGroup, mod: Modifier) {
  const current = [...activeStepModifiers.value]
  const filtered = current.filter(sel => !group.modifiers.some(m => m.id === sel.id))
  filtered.push({
    id: mod.id,
    name: mod.name,
    price: mod.price,
    quantity: 1,
    included_quantity: mod.included_quantity,
  })
  activeStepModifiers.value = filtered
}

function getModifierQty(modId: string): number {
  return modifierSelectionQty(activeStepModifiers.value, modId)
}

function canIncrementModifier(mod: Modifier, groupId: string): boolean {
  if (!productDetail.value) return false
  const group = productDetail.value.modifier_groups.find(g => g.id === groupId)
  if (!group) return false

  return canIncrementModifierSelection({
    selections: activeStepModifiers.value,
    modifierId: mod.id,
    modifierMaxLimit: mod.max_limit,
    groupOptionIds: group.modifiers.map(m => m.id),
    groupMaxSelections: group.max_qty,
  })
}

function incrementModifier(mod: Modifier, groupId: string) {
  if (!canIncrementModifier(mod, groupId)) return

  const index = activeStepModifiers.value.findIndex(m => m.id === mod.id)
  if (index === -1) {
    activeStepModifiers.value = [
      ...activeStepModifiers.value,
      {
        id: mod.id,
        name: mod.name,
        price: mod.price,
        quantity: 1,
        included_quantity: mod.included_quantity,
      },
    ]
    return
  }

  const next = [...activeStepModifiers.value]
  next[index] = {
    ...next[index],
    quantity: (next[index].quantity ?? 1) + 1,
  }
  activeStepModifiers.value = next
}

function decrementModifier(mod: Modifier) {
  const index = activeStepModifiers.value.findIndex(m => m.id === mod.id)
  if (index === -1) return

  const currentQty = activeStepModifiers.value[index].quantity ?? 1
  if (currentQty <= 1) {
    activeStepModifiers.value = activeStepModifiers.value.filter(m => m.id !== mod.id)
    return
  }

  const next = [...activeStepModifiers.value]
  next[index] = {
    ...next[index],
    quantity: currentQty - 1,
  }
  activeStepModifiers.value = next
}

// --- Validation — always validates the ACTIVE step's modifiers ---

const isValid = computed(() => {
  if (!productDetail.value) return false
  return productDetail.value.modifier_groups
    .filter(g => g.is_required)
    .every(g => groupSelectionCount(g.id) >= Math.max(1, g.min_qty))
})

// --- Price — shows total for current context ---

const totalPrice = computed(() => {
  const base = Number(props.product?.price ?? productDetail.value?.price ?? 0)
  if (wizardMode.value) {
    const total = wizardUnits.value.reduce((sum, unit) => {
      return sum + base + modifiersCartTotal(unit.modifiers)
    }, 0)
    return formatPrice(total)
  }
  const modTotal = modifiersCartTotal(selectedModifiers.value)
  return formatPrice((base + modTotal) * quantity.value)
})

function formatModifierPriceLabel(mod: Modifier): string {
  return formatSaleModifierPriceLabel(mod.price, formatPrice, mod.included_quantity)
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

const headerSubtitle = computed(() => {
  if (wizardMode.value) {
    return productDetail.value?.name ?? props.product?.name ?? ''
  }
  const price = productDetail.value?.price ?? props.product?.price
  if (price != null) return formatPrice(Number(price))
  return ''
})

// --- Add to cart ---

async function handleAddToCart() {
  if (!props.product || !isValid.value) return
  try {
    if (wizardMode.value) {
      await cartStore.value.addItemsBatch(
        { id: props.product.id, name: props.product.name, price: props.product.price, has_modifiers: props.product.has_modifiers ?? true },
        wizardUnits.value.map(u => ({ modifiers: u.modifiers, notes: u.notes || undefined }))
      )
    } else {
      await cartStore.value.addItem(
        { id: props.product.id, name: props.product.name, price: props.product.price, has_modifiers: props.product.has_modifiers ?? true },
        quantity.value,
        [...selectedModifiers.value],
        notes.value || undefined
      )
    }
    close()
  } catch (err: any) {
    console.error('Error adding to cart:', err)
    alert(err.message || 'Error al agregar al carrito')
  }
}

function close() {
  emit('update:modelValue', false)
  emit('close')
}

// ESC to close
onMounted(() => {
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue) close()
  }
  window.addEventListener('keydown', onKeydown)
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
})
</script>

<style scoped>
/* Wizard progress dots */
.wizard-progress {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 10px 24px 0;
  flex-shrink: 0;
}

.wizard-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--border));
  transition: all 0.2s ease;
}

.wizard-dot.active {
  background: hsl(var(--primary));
  transform: scale(1.3);
}

.wizard-dot.done {
  background: hsl(var(--success));
}

/* Skeleton */
.skeleton {
  background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--border)) 50%, hsl(var(--muted)) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-title { height: 28px; width: 60%; }
.skeleton-line { height: 16px; width: 90%; }
.skeleton-line.short { width: 50%; }
.skeleton-group { height: 100px; border-radius: 8px; }

.product-description {
  font-size: 16px;
  color: hsl(var(--muted-foreground));
  margin: 0;
  line-height: 1.6;
}

.product-prep-time {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

/* Modifier groups */
.modifier-group {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 16px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.group-name {
  font-size: 16px;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.group-required {
  font-size: 12px;
  font-weight: 600;
  background: hsl(var(--warning) / 0.15);
  color: hsl(var(--warning-foreground));
  padding: 2px 8px;
  border-radius: 20px;
}

.group-optional {
  font-size: 12px;
  font-weight: 600;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  padding: 2px 8px;
  border-radius: 20px;
}

.group-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin: 0 0 12px 0;
}

.group-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 0;
  border-bottom: 1px solid hsl(var(--muted));
}

.option-label:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.option-label.option-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.option-input {
  width: 18px;
  height: 18px;
  accent-color: hsl(var(--primary));
  flex-shrink: 0;
  cursor: pointer;
}

.option-name {
  flex: 1;
  font-size: 16px;
  color: hsl(var(--foreground));
}

.option-price {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.option-price-free {
  color: hsl(var(--success));
}

.option-price-discount {
  color: hsl(var(--success));
}

.option-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.modifier-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.35);
}

.modifier-stepper-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: hsl(var(--card));
  color: hsl(var(--muted-foreground));
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.modifier-stepper-btn:hover:not(:disabled) {
  color: hsl(var(--primary));
}

.modifier-stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.modifier-stepper-value {
  min-width: 22px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--muted-foreground));
}

.modifier-stepper-value.active {
  color: hsl(var(--primary));
}

/* Quantity */
.quantity-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: hsl(var(--muted) / 0.5);
  border-radius: 10px;
}

.quantity-label {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.qty-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid hsl(var(--primary));
  background: hsl(var(--card));
  color: hsl(var(--primary));
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all 0.15s ease;
}

.qty-btn:hover:not(:disabled) {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.qty-btn:disabled {
  border-color: hsl(var(--muted));
  color: hsl(var(--muted));
  cursor: not-allowed;
}

.qty-value {
  font-size: 18px;
  font-weight: 700;
  color: hsl(var(--foreground));
  min-width: 24px;
  text-align: center;
}

/* Notes */
.notes-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notes-label {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.notes-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  font-size: 16px;
  color: hsl(var(--foreground));
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}

.notes-input:focus {
  border-color: hsl(var(--primary));
}

/* Wizard toggle */
.wizard-toggle-section {
  padding: 14px 16px;
  background: hsl(var(--primary) / 0.08);
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 10px;
}

.wizard-toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.toggle-switch {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: hsl(var(--border));
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s ease;
  cursor: pointer;
}

.toggle-switch.on {
  background: hsl(var(--primary));
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: hsl(var(--card));
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px hsl(var(--overlay-backdrop-bg) / 0.2);
}

.toggle-switch.on .toggle-knob {
  transform: translateX(18px);
}

.wizard-toggle-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin: 6px 0 0 52px;
}

.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel-enter-active,
  .panel-leave-active {
    transition: none;
  }
}

/* Unavailability banner */
.unavailable-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 36px 24px;
  text-align: center;
  border-radius: 14px;
}

.unavailable-banner--error {
  background: hsl(var(--destructive) / 0.06);
  border: 1px solid hsl(var(--destructive) / 0.2);
}

.unavailable-banner--offline {
  background: hsl(var(--warning) / 0.06);
  border: 1px solid hsl(var(--warning) / 0.2);
}

.unavailable-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  flex-shrink: 0;
}

.unavailable-icon-wrap--error {
  background: hsl(var(--destructive) / 0.12);
  color: hsl(var(--destructive));
}

.unavailable-icon-wrap--offline {
  background: hsl(var(--warning) / 0.15);
  color: hsl(var(--warning-foreground));
}

.unavailable-icon {
  width: 28px;
  height: 28px;
}

.unavailable-title {
  font-size: 16px;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin: 0;
  letter-spacing: -0.01em;
}

.unavailable-msg {
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  margin: 0;
  line-height: 1.55;
  max-width: 28ch;
}
</style>
