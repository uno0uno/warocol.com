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
          <h2 class="product-drawer-title">
            {{ product?.name || '' }}
          </h2>
          <button class="product-close-btn" @click="close" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

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

          <template v-else-if="productDetail">
            <!-- Product image / emoji -->
            <div class="product-visual">
              <div
                v-if="productDetail.image_url && productDetail.image_url.startsWith('http')"
                class="product-image"
                :style="{ backgroundImage: `url(${productDetail.image_url})` }"
              />
              <div v-else class="product-emoji">
                {{ productDetail.image_url || '🍽️' }}
              </div>
            </div>

            <!-- Description -->
            <p v-if="productDetail.description" class="product-description">
              {{ productDetail.description }}
            </p>

            <!-- Prep time -->
            <p v-if="productDetail.preparation_time" class="product-prep-time">
              ⏱️ {{ productDetail.preparation_time }} min de preparación
            </p>

            <!-- Modifier groups -->
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
                <label
                  v-if="group.max_qty === 1"
                  v-for="mod in availableModifiers(group)"
                  :key="mod.id"
                  class="option-label"
                >
                  <input
                    type="radio"
                    :name="`group-${group.id}`"
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

                <!-- Checkbox (multi-choice) -->
                <label
                  v-if="group.max_qty > 1"
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
              </div>
            </div>

            <!-- Quantity selector -->
            <div class="quantity-section">
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

            <!-- Notes -->
            <div class="notes-section">
              <label class="notes-label">Instrucciones especiales</label>
              <textarea
                v-model="notes"
                class="notes-input"
                placeholder="Ej: Sin cebolla, extra salsa..."
                rows="2"
              />
            </div>
          </template>
        </div>

        <!-- Sticky footer CTA -->
        <footer class="product-drawer-footer">
          <button
            class="cta-btn"
            :disabled="!isValid || cartStore.isLoading || isLoading"
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
  modifier_groups: ModifierGroup[]
}

const props = defineProps<{
  modelValue: boolean
  product: Record<string, any> | null
  tenantSlug: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const cartStore = useOnlineCartStore()

const productDetail = ref<ProductDetail | null>(null)
const isLoading = ref(false)
const selectedModifiers = ref<CartModifier[]>([])
const quantity = ref(1)
const notes = ref('')

// Fetch product detail when drawer opens
watch(() => props.modelValue, async (val) => {
  if (val && props.product) {
    isLoading.value = true
    selectedModifiers.value = []
    quantity.value = 1
    notes.value = ''
    productDetail.value = null
    try {
      const res = await $fetch<{ data: ProductDetail }>(
        `/api/public/restaurant/${props.tenantSlug}/product/${props.product.id}`
      )
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
    } finally {
      isLoading.value = false
    }
  } else if (!val) {
    // Reset on close
    productDetail.value = null
    selectedModifiers.value = []
    quantity.value = 1
    notes.value = ''
  }
})

// Only available modifiers
function availableModifiers(group: ModifierGroup): Modifier[] {
  return group.modifiers.filter(m => m.is_available)
}

function isSelected(modId: string): boolean {
  return selectedModifiers.value.some(m => m.id === modId)
}

function groupSelectionCount(groupId: string): number {
  if (!productDetail.value) return 0
  const group = productDetail.value.modifier_groups.find(g => g.id === groupId)
  if (!group) return 0
  return selectedModifiers.value.filter(sel =>
    group.modifiers.some(m => m.id === sel.id)
  ).length
}

function selectRadio(group: ModifierGroup, mod: Modifier) {
  // Remove previous selection from this group
  selectedModifiers.value = selectedModifiers.value.filter(sel =>
    !group.modifiers.some(m => m.id === sel.id)
  )
  selectedModifiers.value.push({ id: mod.id, name: mod.name, price: mod.price })
}

function toggleCheckbox(mod: Modifier) {
  if (isSelected(mod.id)) {
    selectedModifiers.value = selectedModifiers.value.filter(m => m.id !== mod.id)
  } else {
    selectedModifiers.value.push({ id: mod.id, name: mod.name, price: mod.price })
  }
}

// CTA is valid when all required groups have at least one selection
const isValid = computed(() => {
  if (!productDetail.value) return false
  return productDetail.value.modifier_groups
    .filter(g => g.is_required)
    .every(g => groupSelectionCount(g.id) >= Math.max(1, g.min_qty))
})

const totalPrice = computed(() => {
  const base = props.product?.price ?? productDetail.value?.price ?? 0
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

async function handleAddToCart() {
  if (!props.product || !isValid.value) return
  try {
    await cartStore.addItem(
      { id: props.product.id, name: props.product.name, price: props.product.price },
      quantity.value,
      [...selectedModifiers.value],
      notes.value || undefined
    )
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
  background: rgba(0, 0, 0, 0.5);
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
  background: white;
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
  border-bottom: 1px solid #e5e7eb;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.product-drawer-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: calc(100% - 48px);
}

.product-close-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.product-close-btn:hover {
  background: #e5e7eb;
  color: #111827;
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
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
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
  background: #f3f4f6;
}

.product-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
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
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.product-prep-time {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

/* Modifier groups */
.modifier-group {
  border: 1px solid #e5e7eb;
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
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.group-required {
  font-size: 11px;
  font-weight: 600;
  background: #fef3c7;
  color: #92400e;
  padding: 2px 8px;
  border-radius: 20px;
}

.group-optional {
  font-size: 11px;
  font-weight: 600;
  background: #f3f4f6;
  color: #6b7280;
  padding: 2px 8px;
  border-radius: 20px;
}

.group-hint {
  font-size: 12px;
  color: #9ca3af;
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
  border-bottom: 1px solid #f3f4f6;
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
  accent-color: #667eea;
  flex-shrink: 0;
  cursor: pointer;
}

.option-name {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.option-price {
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
}

.option-price-free {
  color: #10b981;
}

/* Quantity */
.quantity-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
}

.quantity-label {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
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
  border: 2px solid #667eea;
  background: white;
  color: #667eea;
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
  background: #667eea;
  color: white;
}

.qty-btn:disabled {
  border-color: #d1d5db;
  color: #d1d5db;
  cursor: not-allowed;
}

.qty-value {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
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
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.notes-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}

.notes-input:focus {
  border-color: #667eea;
}

/* Footer CTA */
.product-drawer-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

.cta-btn {
  width: 100%;
  padding: 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cta-btn:hover:not(:disabled) {
  background: #5568d3;
}

.cta-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
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
}
</style>
