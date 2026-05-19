<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="product-backdrop"
        @click="close"
      />
    </Transition>

    <!-- Drawer -->
    <Transition name="product-slide">
      <aside v-if="modelValue" class="product-drawer">
        <!-- Header -->
        <header class="product-drawer-header">
          <div class="header-titles">
            <h2 class="product-drawer-title">
              {{ wizardMode ? `Ítem ${wizardStep + 1} de ${quantity}` : (product?.name || '') }}
            </h2>
            <p v-if="wizardMode" class="header-product-name">{{ product?.name }}</p>
          </div>
          <button class="product-close-btn" @click="close" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

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
        <div class="product-drawer-body">

          <!-- Skeleton while loading -->
          <template v-if="isLoading">
            <div class="skeleton skeleton-image" />
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
            <!-- Product image / emoji — hidden in wizard steps after 1 to save space -->
            <div v-if="!wizardMode" class="product-visual">
              <img
                v-if="productDetail.image_url && productDetail.image_url.startsWith('http')"
                :src="productDetail.image_url"
                :alt="productDetail.name"
                class="product-image"
              />
              <div v-else class="product-emoji">
                {{ productDetail.image_url || '🍽️' }}
              </div>
            </div>

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
                    <span class="option-price" :class="{ 'option-price-free': mod.price === 0 }">
                      {{ mod.price === 0 ? 'Gratis' : `+${formatPrice(mod.price)}` }}
                    </span>
                  </label>
                </template>

                <!-- Checkbox (multi-choice) -->
                <template v-else>
                  <label
                    v-for="mod in availableModifiers(group)"
                    :key="mod.id"
                    class="option-label"
                    :class="{ 'option-disabled': !isSelected(mod.id) && groupSelectionCount(group.id) >= group.max_qty }"
                  >
                    <input
                      type="checkbox"
                      :value="mod.id"
                      :checked="isSelected(mod.id)"
                      :disabled="!isSelected(mod.id) && groupSelectionCount(group.id) >= group.max_qty"
                      @change="toggleCheckbox(mod)"
                      class="option-input"
                    />
                    <span class="option-name">{{ mod.name }}</span>
                    <span class="option-price" :class="{ 'option-price-free': mod.price === 0 }">
                      {{ mod.price === 0 ? 'Gratis' : `+${formatPrice(mod.price)}` }}
                    </span>
                  </label>
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

        <!-- Sticky footer CTA -->
        <footer class="product-drawer-footer">
          <!-- Wizard mode footer -->
          <template v-if="wizardMode">
            <div class="wizard-cta-row">
              <button
                class="wizard-back-btn"
                :disabled="wizardStep === 0"
                @click="wizardStep--"
              >
                ← Anterior
              </button>
              <!-- Not last step -->
              <button
                v-if="wizardStep < quantity - 1"
                class="cta-btn wizard-next-btn"
                :disabled="!isValid"
                @click="goToNextStep"
              >
                Siguiente →
              </button>
              <!-- Last step -->
              <button
                v-else
                class="cta-btn"
                :disabled="!isValid || cartStore.isLoading"
                @click="handleAddToCart"
              >
                <span v-if="cartStore.isLoading">Agregando...</span>
                <span v-else>Agregar {{ quantity }} — {{ totalPrice }}</span>
              </button>
            </div>
          </template>

          <!-- Normal mode footer -->
          <button
            v-else
            class="cta-btn"
            :disabled="!isValid || cartStore.isLoading || isLoading || fetchError || isProductUnavailable"
            @click="handleAddToCart"
          >
            <span v-if="cartStore.isLoading">Agregando...</span>
            <span v-else>
              Agregar {{ quantity }} al carrito — {{ totalPrice }}
            </span>
          </button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useOnlineCartStore, type CartModifier } from '~/stores/online_cart'

interface Modifier {
  id: string
  name: string
  price: number
  is_available: boolean
  is_default: boolean
  max_limit: number
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
        defaults.push({ id: mod.id, name: mod.name, price: mod.price })
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
            selectedModifiers.value.push({ id: mod.id, name: mod.name, price: mod.price })
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
  return activeStepModifiers.value.some(m => m.id === modId)
}

function groupSelectionCount(groupId: string): number {
  if (!productDetail.value) return 0
  const group = productDetail.value.modifier_groups.find(g => g.id === groupId)
  if (!group) return 0
  return activeStepModifiers.value.filter(sel =>
    group.modifiers.some(m => m.id === sel.id)
  ).length
}

function selectRadio(group: ModifierGroup, mod: Modifier) {
  const current = [...activeStepModifiers.value]
  const filtered = current.filter(sel => !group.modifiers.some(m => m.id === sel.id))
  filtered.push({ id: mod.id, name: mod.name, price: mod.price })
  activeStepModifiers.value = filtered
}

function toggleCheckbox(mod: Modifier) {
  const current = [...activeStepModifiers.value]
  if (current.some(m => m.id === mod.id)) {
    activeStepModifiers.value = current.filter(m => m.id !== mod.id)
  } else {
    activeStepModifiers.value = [...current, { id: mod.id, name: mod.name, price: mod.price }]
  }
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
    // Show total for all units
    const total = wizardUnits.value.reduce((sum, unit) => {
      const modTotal = unit.modifiers.reduce((s, m) => s + m.price, 0)
      return sum + base + modTotal
    }, 0)
    return formatPrice(total)
  }
  const modTotal = selectedModifiers.value.reduce((sum, m) => sum + m.price, 0)
  return formatPrice((base + modTotal) * quantity.value)
})

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

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
/* Backdrop */
.product-backdrop {
  position: fixed;
  inset: 0;
  background: hsl(var(--foreground) / 0.5);
  z-index: 100;
  backdrop-filter: blur(2px);
}

/* Drawer */
.product-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 480px;
  background: hsl(var(--card));
  z-index: 101;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* Header */
.product-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  max-width: calc(100% - 48px);
}

.product-drawer-title {
  font-size: 18px;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-product-name {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-close-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--muted));
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  transition: all 0.2s ease;
}

.product-close-btn:hover {
  background: hsl(var(--border));
  color: hsl(var(--foreground));
}

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

/* Body */
.product-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.skeleton-image { height: 180px; border-radius: 12px; }
.skeleton-title { height: 28px; width: 60%; }
.skeleton-line { height: 16px; width: 90%; }
.skeleton-line.short { width: 50%; }
.skeleton-group { height: 100px; border-radius: 8px; }

/* Product visual */
.product-visual {
  border-radius: 12px;
  overflow: hidden;
  height: 180px;
  background: hsl(var(--muted));
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.product-emoji {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
}

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
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-switch.on .toggle-knob {
  transform: translateX(18px);
}

.wizard-toggle-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin: 6px 0 0 52px;
}

/* Footer CTA */
.product-drawer-footer {
  padding: 16px 24px;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  flex-shrink: 0;
}

.cta-btn {
  width: 100%;
  padding: 16px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cta-btn:hover:not(:disabled) {
  background: hsl(var(--primary) / 0.85);
}

.cta-btn:disabled {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  cursor: not-allowed;
}

/* Wizard footer */
.wizard-cta-row {
  display: flex;
  gap: 10px;
}

.wizard-back-btn {
  flex: 0 0 36%;
  padding: 16px 8px;
  background: transparent;
  color: hsl(var(--foreground));
  border: 2px solid hsl(var(--border));
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wizard-back-btn:hover:not(:disabled) {
  border-color: hsl(var(--primary));
  color: hsl(var(--primary));
}

.wizard-back-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.wizard-next-btn {
  flex: 1;
}

/* Transitions — desktop: slide from right */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.product-slide-enter-active,
.product-slide-leave-active {
  transition: transform 0.3s ease;
}
.product-slide-enter-from,
.product-slide-leave-to {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .product-slide-enter-active,
  .product-slide-leave-active {
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

/* Mobile: drawer slides from bottom */
@media (max-width: 640px) {
  .product-drawer {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: 100%;
    max-height: 92vh;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  }

  .product-slide-enter-from,
  .product-slide-leave-to {
    transform: translateY(100%);
  }

  .wizard-cta-row {
    gap: 8px;
  }

  .wizard-back-btn {
    flex: 0 0 32%;
    font-size: 14px;
    padding: 14px 6px;
  }
}
</style>
